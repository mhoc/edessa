var waterfall = require('./index.js')({
  config: { backend: 'dynamodb' },
  // configFile: './mysettings.yml',
  errOnMissing: true,
})

waterfall({
  config: [
    'meteorAppUrl',
    'meteorMongoUrl',
    'otherThing',
  ],
  Hello: 'Nope',
  stage: 'staging',
}, [
  (state, done) => {
    console.log('- inside waterfall')
    console.log(state)
    done(null, state)
  }
], (err, result) => {
  console.log('- waterfall finished')
  console.log('error: ' + err)
  console.log(result)
})
