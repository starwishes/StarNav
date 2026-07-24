const unexpectedUse = () => {
  throw new Error('node-cron test shim must be mocked before use')
}

export default {
  schedule: unexpectedUse
}
