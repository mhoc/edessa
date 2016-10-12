# EDESSA

A highly opinionated wrapper around `async.waterfall`.

- Pass some external state into the first item in the waterfall
- Retrieve configuration parameters from DynamoDB
- Execute the waterfall

# Setup

```js
const edessa = require('edessa')({

  // options concerning the config store go here
  config: {

    // which backend to use. currently, only dynamodb is supported
    backend: 'dynamodb',

    // how the dynamodb table is set up.
    dynamodb: {
      // which table you are using. defaults to "Config"
      table: 'Config',
      // the names of the three columns edessa expects
      // what's shown is the defaults
      field: [ 'key', 'stage', 'value' ]
    }
  },

  // the location of the personal config file.
  // if this file exists and is provided, its keys will override the
  // values retrieved from the config backend
  configFile: 'personalconfig.yaml',

  // if a key requested is missing, this will cause edessa to pipe
  // an error through to the error condition of the waterfall. this defaults
  // to true.
  errOnMissing: true,

})
```

# Usage

```js
edessa({
  config: [
    'mainDatabaseUrl',
  ],
  userId: '12345',

  // this variables decides which config parameters to get from the config
  // backend. if it is not provided, it defaults to process.env.NODE_ENV.
  // you can always override this.
  stage: process.env.NODE_ENV,

}, [
  component1,
  component2,
  component3,
], (err, result) => {
  ...
})

const component1 = (state, done) => {
  console.log(state)
  // state.mainDatabaseUrl
  // state.stage
  // state.userId
}
```

# DynamoDB

A table has to be set up in dynamodb with three fields.

- `key`
 - the configuration key for that given configuration parameter
 - hash key
- `stage`
 - the deployment stage this configuration parameter applies to
 - range key
- `value`
 - the actual value of the configuration parameter
 - this can be any DynamoDB type you'd like

The read/write capacity of this table is totally up to you and might be something you have to play with.

## AWS Authentication

Authentication currently must be provided by the environment.

# Future Improvements

- Cascading Stages
 - The ability to explicitly state priority levels for stages.
 - So something like: [ "dev", "dev-mike", "$configfile" ]
 - Values in config file override values from backend in stage dev-mike, which override values in dev
- etcd support
