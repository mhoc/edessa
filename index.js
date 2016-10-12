var async = require('async')
var aws = require('aws-sdk')
var flattenDDB = require('dynamodb-marshaler').unmarshalItem
var fs = require('fs')
var _ = require('lodash')
var yaml = require('js-yaml')

var DynamoDB = new aws.DynamoDB()

module.exports = function(options) {
  if (!options) options = {}
  var config = options.config
  if (config) {
    var backend = config.backend
    if (!backend) throw 'no config backend specified in edessa config'
    var backendConfig = config[backend]
    if (!backendConfig) backendConfig = {}
    config[backend] = SetDefaultConfig(backend, backendConfig)
  }
  var configFile = options.configFile
  if (configFile) {
    if (_.includes(configFile, 'json')) {
      options.configFile = require(configFile)
    } else if (_.includes(configFile, 'yaml') || _.includes(configFile, 'yml')) {
      options.configFile = yaml.safeLoad(fs.readFileSync(configFile, 'utf8'))
    }
  }
  var errOnMissing = options.errOnMissing
  if (!_.isBoolean(errOnMissing)) {
    options.errOnMissing = true
  }
  return Edessa(options)
}

var SetDefaultConfig = function(backend, config) {
  switch (backend) {
    case 'dynamodb':
      if (!config.table) config.table = 'Config'
      if (!config.fields) config.fields = [ 'key', 'stage', 'value' ]
  }
  return config
}

var Edessa = function(options) {
  return function(initObj, components, done) {
    var waterfallBody = [
      InitState(initObj),
      InitConfig(options),
      OverrideLocalSettings(options),
    ]
    waterfallBody.push.apply(waterfallBody, components)
    async.waterfall(waterfallBody, done)
  }
}

var InitState = function(initObj) {
  return function(done) {
    if (!initObj.stage) {
      initObj.stage = process.env.NODE_ENV
    }
    return done(null, initObj)
  }
}

var InitConfig = function(options) {
  if (!options.config) return NoConfigRequested
  switch (options.config.backend) {
    case 'dynamo': return GetDynamoConfig(options)
    case 'dynamodb': return GetDynamoConfig(options)
  }
  return NoConfigRequested
}

var NoConfigRequested = function(state, done) {
  delete state['config']
  return done(null, state)
}

var GetDynamoConfig = function(options) {
  return function(state, done) {
    if (!state.config || state.config.length === 0) {
      return NoConfigRequested(state, done)
    }
    var stage = state.stage || options.defaultStage
    if (!stage) {
      return done("no edessa stage set: this will cause the dynamodb query to fail")
    }
    var keys = state.config
    var fieldKey = options.config.dynamodb.fields[0]
    var fieldStage = options.config.dynamodb.fields[1]
    var fieldValue = options.config.dynamodb.fields[2]
    var getKeys = _.map(keys, function(configKey) {
      var returnObj = {}
      returnObj[fieldKey] = { S: configKey }
      returnObj[fieldStage] = { S: stage }
      return returnObj
    })
    var table = options.config.dynamodb.table
    var requestItemsObj = {}
    requestItemsObj[table] = {
      Keys: getKeys
    }
    DynamoDB.batchGetItem({
      RequestItems: requestItemsObj
    }, function(err, resp) {
      if (err) return done(err)
      if (Object.keys(resp.UnprocessedKeys).length > 0) {
        return done("You've requested more than 16MB (or 100 keys) in config keys. " +
          "Edessa doesn't support this... yet. Report an issue!")
      }
      var configObj = _(resp.Responses[table])
        .map(flattenDDB)
        .reduce(function(accum, curr) {
          accum[curr[fieldKey]] = curr[fieldValue]
          return accum
        }, {})
      if (options.errOnMissing) {
        const diff = _.xor(Object.keys(configObj), keys)
        if (diff.length > 0) {
          const errMsg = _.reduce(diff, (acc, curr, i) => {
            if (i !== 0) acc += ', '
            acc += "'" + curr + "'"
            return acc
          }, 'edessa: some of the config keys requested were not found in dynamodb: ')
          return done(errMsg, state)
        }
      }
      state = Object.assign(state, configObj)
      delete state['config']
      done(null, state)
    })
  }
}

var OverrideLocalSettings = function(options) {
  return function(state, done) {
    if (options.configFile) {
      state = _.assign(state, options.configFile)
    }
    return done(null, state)
  }
}
