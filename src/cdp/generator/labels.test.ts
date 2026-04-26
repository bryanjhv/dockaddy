import type { Container } from '../caddyfile/caddyfile'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'vitest'
import { Container_Marshal } from '../caddyfile/marshal'
import { _labelsToCaddyfile } from './labels'

describe('labels to caddyfile', () => {
	const folder = join(__dirname, './testdata/labels')

	const files = readdirSync(folder, { withFileTypes: true })
		.filter(f => f.isFile())
		.map(f => f.name)

	it.for(files)('%s', (filename, { expect, skip }) => {
		const data = readFileSync(join(folder, filename), 'utf8')
		const content = data.replaceAll(/\r?\n/g, '\n')

		const parts = content.split('----------')
		const labelsString = parts[0]!.trim()
		const expectedCaddyfile = parts[1]!.trim()

		const labels = parseLabelsFromString(labelsString)

		let caddyfileBlock: Container | null = null
		let err: unknown = null
		try {
			caddyfileBlock = _labelsToCaddyfile(labels, null, () => ['target'])
		}
		catch (error) {
			err = error
		}

		if (caddyfileBlock === null) {
			if (expectedCaddyfile.startsWith('err: '))
				expect((err as Error).message).toBe(expectedCaddyfile.slice(5))
			else if (expectedCaddyfile !== '')
				expect.soft(null).toBe(expectedCaddyfile)
			skip()
		}

		expect(err).toBeNull()

		const actualCaddyfile = Container_Marshal(caddyfileBlock!).trim()
		expect(expectedCaddyfile).toBe(actualCaddyfile)
	})
})

function parseLabelsFromString(s: string): Record<string, string> {
	const labels: Record<string, string> = {}

	const lines = s.split('\n')
	let lineNumber = 0

	for (let line of lines) {
		line = line.trim().replaceAll('NEW_LINE', '\n')
		lineNumber++

		if (line.startsWith('#'))
			continue

		if (line.length === 0)
			continue

		let fields = line.split('=')
		if (fields.length > 2)
			fields = [fields[0]!, fields.slice(1).join('=')]
		if (fields.length !== 2)
			throw new Error(`can't parse line ${lineNumber}; line should be in KEY = VALUE format`)

		const key = fields[0]!.trim()
		const value = fields[1]!.trim()

		if (key === '')
			throw new Error(`missing or empty key on line ${lineNumber}`)
		labels[key] = value
	}

	return labels
}
