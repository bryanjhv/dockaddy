import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'vitest'
import { Container_Marshal, Unmarshal } from './marshal'

describe('marshal unmarshal', () => {
	const folder = join(__dirname, './testdata/marshal')

	const files = readdirSync(folder, { withFileTypes: true })
		.filter(f => f.isFile())
		.map(f => f.name)

	it.for(files)('%s', (filename, { expect }) => {
		const data = readFileSync(join(folder, filename), 'utf8')
		const content = data.replaceAll(/\r?\n/g, '\n')

		const parts = content.split('----------\n')
		const beforeCaddyfile = parts[0]!
		const expectedCaddyfile = parts[1]!

		const container = Unmarshal(beforeCaddyfile)
		const result = Container_Marshal(container)

		const actualCaddyfile = result

		expect(expectedCaddyfile).toBe(actualCaddyfile)
	})
})
