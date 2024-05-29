import { Pool, Client } from 'pg'
import type { PoolClient, QueryResult, PoolConfig } from 'pg'
import formatQuery from 'pg-format'
import _ from 'lodash'

export type DbConfig = Omit<PoolConfig, 'database'>

class PostgreSQL {
  private config: DbConfig
  private pool: Pool | null = null
  private client: Client | null = null
  private usePool: boolean
  private dbName: string | null = null

  constructor(config: DbConfig, usePool = true) {
    this.config = config
    this.usePool = usePool
    this.initialize()
  }

  private async initialize(): Promise<void> {
    if (this.usePool) {
      this.pool = new Pool({
        ...this.config,
        idleTimeoutMillis: 30000,
        max: 20,
        min: 2,
      })
    } else {
      this.client = new Client(this.config)
      await this.client.connect()
    }
  }

  public async setDatabaseName(databaseName: string): Promise<void> {
    this.dbName = databaseName
    if (this.pool) {
      await this.pool.end()
      this.pool = new Pool({
        ...this.config,
        database: databaseName,
        idleTimeoutMillis: 30000,
        max: 20,
        min: 2,
      })
    } else if (this.client) {
      await this.client.end()
      this.client = new Client({
        ...this.config,
        database: databaseName,
      })
      await this.client.connect()
    } else {
      throw new Error('Database connection not initialized.')
    }
  }

  public getDatabaseName(): string | null {
    return this.dbName
  }

  public async runQuery(query: string, parse = true): Promise<any> {
    const client = this.pool ? await this.pool.connect() : this.client
    if (!client) throw new Error('Database connection not initialized.')

    try {
      const results: QueryResult<any> = await client.query(query)
      if (parse) {
        const parsedResults = this.parseQueryResult(results)
        return parsedResults.length === 1 ? parsedResults[0] : parsedResults
      }
      return results.rows
    } catch (error) {
      console.error('Error executing query:', error)
      throw new Error('Failed to execute database query.')
    } finally {
      if (this.pool) {
        ;(client as PoolClient).release()
      } else {
        await (client as Client).end()
      }
    }
  }

  public async runBatchQueries(queries: string[], parse = true): Promise<any> {
    const client = this.pool ? await this.pool.connect() : this.client
    if (!client) throw new Error('Database connection not initialized.')

    try {
      const results: QueryResult<any> = await client.query(queries.join(';'))
      if (parse) {
        const parsedResults = this.parseQueryResult(results)
        return parsedResults.length === 1 ? parsedResults[0] : parsedResults
      }
      return results.rows
    } catch (error) {
      console.error('Error executing batch queries:', error)
      throw new Error('Failed to execute database batch queries.')
    } finally {
      if (this.pool) {
        ;(client as PoolClient).release()
      } else {
        await (client as Client).end()
      }
    }
  }

  private parseQueryResult({ rows }: { rows: any[] }): any[] {
    return _.map(rows, (responseRow) => {
      if (Array.isArray(responseRow)) {
        return _.map(responseRow, (row) => ({ ...row }))
      } else {
        return { ...responseRow }
      }
    })
  }

  public format(queryString: string, values: any[]): string {
    return formatQuery(queryString, values)
  }

  public async close(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end()
      } else if (this.client) {
        await this.client.end()
      }
    } catch (error) {
      console.error('Error closing database connection:', error)
      throw new Error('Failed to close database connection.')
    }
  }
}

export default PostgreSQL
