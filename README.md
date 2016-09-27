# EDESSA

A highly opinionated wrapper for `async.waterfall`, handling initialization, configuration retrieval from a database, and executing all the components of the waterfall.

# What Its Good For

- Storing and retrieving configuration parameters in DynamoDB (or other backends)
- Injecting those and other global state into some other function using an Async.Waterfall

# Usage

```
const waterfall = require('edessa')({
  config: {
    backend: 'dynamodb'
    dynamodb: {
      table: 'Config',
      fields: [ 'key', 'stage', 'value' ],
    }
  },
  configFile: 'myconfig.yaml',
})

waterfall({
  config: [
    'mainDatabaseUrl',
  ],
  configFile: 'settings.dev.yaml',
  stage: 'production',
  userId: '12345',
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
- `configFile`
 - A string corresponding to a `.json` or `.yaml` file storing configs. 
 - Any config variables provided in this file will override anything pulled from the config backend.

# Special Behavior

- `state.stage`
 - Special state variable
 - Determines the stage of each configuration variable to read.
 - If this is not provided, we default to `defaultStage` which is provided in library config, or `"all"`. 

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