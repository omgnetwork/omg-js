function getFlags (...keys): any {
  const argMap = {}
  for (const position in process.argv) {
    const arg = process.argv[position]
    for (const key of keys) {
      if (arg.includes(key)) {
        const value = arg.split(`--${key}=`)[1]
        argMap[key] = value

        if (key === 'owner' && value !== 'alice' && value !== 'bob') {
          throw Error('Please specify --owner as either alice or bob')
        }
        if (key === 'from' && value !== 'alice' && value !== 'bob') {
          throw Error('Please specify --from as either alice or bob')
        }
        if (key === 'to' && value !== 'alice' && value !== 'bob') {
          throw Error('Please specify --to as either alice or bob')
        }

        break
      }
    }
  }

  const missingArgs = []
  for (const key of keys) {
    if (!argMap[key]) {
      missingArgs.push(`Missing --${key} flag.`)
    }
  }
  if (missingArgs.length) {
    throw Error(JSON.stringify(missingArgs, null, 2))
  }

  return argMap
}

export default getFlags;
