# CloudWatch Front Logger [![npm version](https://badge.fury.io/js/cloudwatch-front-logger.svg)](https://badge.fury.io/js/cloudwatch-front-logger) [![Build Status](https://github.com/mpyw/cloudwatch-front-logger/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/mpyw/cloudwatch-front-logger/actions) [![Coverage Status](https://coveralls.io/repos/github/mpyw/cloudwatch-front-logger/badge.svg?branch=master)](https://coveralls.io/github/mpyw/cloudwatch-front-logger?branch=master) [![npm](https://img.shields.io/npm/dt/cloudwatch-front-logger.svg)](https://www.npmjs.com/package/cloudwatch-front-logger)

Save your browser console logs to AWS CloudWatch (Inspired by [agea/console-cloud-watch](https://github.com/agea/console-cloud-watch))

## Installing

```
npm i cloudwatch-front-logger
```

## Preparation

### 1. Create Public Log Group

Go to [CloudWatch console](https://console.aws.amazon.com/cloudwatch) and create Log Group for this purpose.

### 2. Create Policy

Go to [IAM Console](https://console.aws.amazon.com/iam/home) and create restricted policy for CloudWatch Logs.

- `logs:CreateLogStream`
- `logs:PutLogEvents`

```json5
{
    "Version": "2019-12-08",
    "Statement": [
        {
            "Sid": "CloudWatchFrontLoggerSid",
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": [
                "arn:aws:logs:*:*:log-group:<LOG_GROUP_NAME>:*:*",
                "arn:aws:logs:*:*:log-group:<LOG_GROUP_NAME>"
            ]
        }
    ]
}
```

### 3. Create IAM user

Go to [IAM Console](https://console.aws.amazon.com/iam/home) and create user with the restricted policy.

## Basic Usage

```js
import { Logger } from 'cloudwatch-front-logger'

const accessKeyId = 'XXXXXXXXXXXXXXXXXXXX'
const secretAccessKey = 'YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY'
const region = 'ap-northeast-1'
const logGroupName = '<LOG_GROUP_NAME>'

const logger = new Logger(accessKeyId, secretAccessKey, region, logGroupName)
logger.install()
```

Logs are collected from the following sources.

- Uncaught Error
- `console.error()` call
- Manual `logger.onError()` call<br>(See integration examples)

## Advanced Usage

### Personalize LogStream

By default, `"anonymous"` is used for `logStreamName` value.
If you wish allocating a unique stream for each user, you can use a method such as [Canvas Fingerprint](https://github.com/Valve/fingerprintjs2).
Pass a resolver function as **`logStreamNameResolver`** option value on `install()` call.

```js
import Fingerprint2 from 'fingerprintjs2'

logger.install({
  logStreamNameResolver() {
    return new Promise((resolve) => new Fingerprint2().get(resolve))
  },
})
```

### Customize Formatted Message<br>Filter Errors

By default, messages are formatted into **JSON** string which has `message` and `type`.

```json5
{
  "message": "Err: Something went wrong",
  "type": "uncaught"
}
```

```json5
{
  "message": "Something went wrong",
  "type": "console",
  "level": "error"
}
```

If you wish formatting them by yourself, pass a formatter function as **`messageFormatter`** option value on `install()` call. Note that you can cancel by returning **`null`** from the fuunction.

```js
import StackTrace from 'stacktrace-js'

logger.install({
  async messageFormatter(e, info = { type: 'unknown' }) {
    if (!e.message) {
      return null
    }
    
    let stack = null
    if (e.stack) {
      stack = e.stack
      try {
        stack = await StackTrace.fromError(e, { offline: true })
      } catch (_) {
      }
    }

    return JSON.stringify({
      message: e.message,
      timestamp: new Date().getTime(),
      userAgent: window.navigator.userAgent,
      stack,
      ...info,
    })
  },
})
```

### Use Asynchronous Storage instead of `localStorage`

By default, **`localStorage`** is used for caching `logStreamName` and `nextSequenceToken`.
Still `localStorage` has only synchronous API, asynchronous interfaces are also supported.
If you need to change storage implementation from `localStorage`, pass an instance as **`storage`** option value on `install()` call.

```js
import { AsyncStorage } from 'react-native'

logger.install({
  storage: AsyncStorage,
})
```

## Integration Examples

### React (Component)

```jsx
class LoggerComponent extends React.component {

  componentDidCatch(e, info) {
    this.props.logger.onError(e, {
      ...info,
      type: 'react',
    })
  }

  render() {
    return this.props.children
  }
}
```

```jsx
<LoggerComponent logger={logger}>
  <App />
</LoggerComponent>
```

### Redux (Middleware)

```js
const createLoggerMiddleware = (logger) => (store) => (next) => (action) => {
  try {
    return next(action)
  } catch (e) {
    logger.onError(e, {
      action,
      type: 'redux',
    })
  }
}
```

```js
const store = createStore(
  combineReducers(reducers),
  applyMiddleware(createLoggerMiddleware(logger))
)
```
