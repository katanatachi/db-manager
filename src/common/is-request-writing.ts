import _ from 'lodash'

export const isRequestWriting = (queryStrings: string | string[]): boolean => {
  let queries: string[]

  if (typeof queryStrings === 'string') {
    queries = [queryStrings]
  } else {
    queries = queryStrings
  }

  const index = _.findIndex(queries, (queryString) => {
    const qs = queryString.toLowerCase()
    return qs.includes('insert') || qs.includes('update') || qs.includes('delete') || qs.includes('create')
  })

  return index !== -1
}
