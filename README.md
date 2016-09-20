# EDESSA

A highly opinionated wrapper for `async.waterfall`, handling initialization, configuration retrieval from a database, and executing all the components of the waterfall.

# Background

`async.waterfall` makes a good backbone for something like a Lambda function or the body of a recurring job with lots of asynchronous calls. However, managing the parameters that are passed between components of a waterfall, especially when you are moving things around during development, can be confusing. 

This lead to the personal adoption of a pattern that looks something like:

```
async.waterfall([
  component1({
    stage: 'prod',
    userId: '12345',
    otherParam: 12,
  }),
  component2,
  component3,
])

const component1 = (state) => {
  return (done) => {
    done(null, state)
  }
}

const component2 = (state, done) => {
  // etc  
}
```

Essentially, using a `state` variable to store anything related to the execution context of the waterfall. 

# Configuration

Next problem: pulling stage-specific configuration parameters from a database or other source. I already started this off by saying it was highly-opinionated, so lets keep that train rolling.

Wouldn't it be cool if you could do:

```
async.waterfall([
  state({
    stage: 'production',
  }),
  config([
    'MainDatabaseUrl'
  ]),
  nextComponent,
])

const nextComponent = (done) => {
  assert(nextComponent.MainDatabaseUrl === 'mydburl') // +1 
}
```

# Usage

```
const waterfall = require('edessa')({
  config: {
    backend: 'dynamodb'
    dynamodb: {
      table: 'Config',
      fields: [ 'key', 'stage', 'value' ],
    }
  }

})

waterfall({
  config: [
    'mainDatabaseUrl',
  ],
  stage: 'production',
  userId: '12345',
}, [
  component1,
  component2,
  component3,
], (err, result) => {
  
})

const component1 = (state, done) => {
  console.log(state)
  // state.mainDatabaseUrl
  // state.stage
  // state.userId
}
```

# Options

- `config.backend` 
 - Required in order to fetch config variables
 - Select where your configuration parameters are stored. 
 - Options: `dynamodb`
- `config.dynamodb.table`
 - The dynamodb table where configuration parameters are stored
 - Optional: defaults to `Config`
- `config.dynamodb.fields`
 - An ordered list of the dynamodb field names (see DynamoDB below)
 - Optional: defaults to `[ 'key', 'stage', 'value' ]`

# Special Behavior

- `state.stage`
 - A special variable in the object you provide which will be used to determine which stage of each configuration variable to return. 
 - If it is not provided, we default to the `defaultStage` provided in the library config, or `"all"` if that is not provided.

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