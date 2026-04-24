import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'vitest'
import { Container_Marshal, Unmarshal } from './marshal'
import { Container_Merge } from './merge'

describe('merge', () => {
	const folder = join(__dirname, './testdata/merge')

	const files = readdirSync(folder, { withFileTypes: true })
		.filter(f => f.isFile())
		.map(f => f.name)

	it.for(files)('%s', (filename, { expect }) => {
		const data = readFileSync(join(folder, filename), 'utf8')
		const content = data.replaceAll(/\r?\n/g, '\n')

		const parts = content.split('----------\n')
		const caddyfile1 = parts[0]!
		const caddyfile2 = parts[1]!
		const expectedCaddyfile = parts[2]!

		const container1 = Unmarshal(caddyfile1)
		const container2 = Unmarshal(caddyfile2)

		Container_Merge(container1, container2)

		const result = Container_Marshal(container1)

		const actualCaddyfile = result

		expect(expectedCaddyfile).toBe(actualCaddyfile)
	})
})
