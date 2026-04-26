import type { TestContext } from 'vitest'
import type { Compose } from '../../types'
import type { Options } from '../config'
import { describe, it } from 'vitest'
import { CaddyfileGenerator_GenerateCaddyfile, CreateGenerator, DefaultLabelPrefix } from './generator'

describe('generator', () => {
	it('merge config content', (context) => {
		const compose: Compose = {
			services: {
				service: {
					labels: {
						'caddy': 'example.com',
						'caddy.reverse_proxy': '{{upstreams}}',
						'caddy_1.experimental_http3': '',
					},
				},
			},
		}

		const baseCaddyfile = '{\n'
			+ '	email test@example.com\n'
			+ '	experimental_http3\n'
			+ '}\n'
			+ 'example.com {\n'
			+ '	reverse_proxy 127.0.0.1\n'
			+ '}\n'

		const expectedCaddyfile = baseCaddyfile.replace(/(127\.0\.0\.1)/, '$1 <service-1-ip>')

		testGeneration(context, compose, (options) => {
			options.CaddyfilePath = baseCaddyfile
		}, expectedCaddyfile)
	})

	it('ignore labels without caddy prefix', (context) => {
		const compose: Compose = {
			services: {
				service: {
					labels: {
						'caddy_version': '2.0.0',
						'caddyversion': '2.0.0',
						'caddy_.version': '2.0.0',
						'version_caddy': '2.0.0',
					},
				},
			},
		}

		const expectedCaddyfile = '# Empty caddyfile'

		testGeneration(context, compose, undefined, expectedCaddyfile)
	})

	it('with labels array', (context) => {
		const compose: Compose = {
			services: {
				service: {
					labels: [
						'caddy=example.com',
						'caddy.reverse_proxy={{upstreams}}',
						'caddy.experimental_http3',
					],
				},
			},
		}

		const expectedCaddyfile = 'example.com {\n'
			+ '	experimental_http3\n'
			+ '	reverse_proxy <service-1-ip>\n'
			+ '}\n'

		testGeneration(context, compose, undefined, expectedCaddyfile)
	})
})

function testGeneration(
	context: TestContext,
	compose: Compose,
	customizeOptions: undefined | ((options: Options) => void),
	expectedCaddyfile: string,
) {
	const options: Options = {
		LabelPrefix: DefaultLabelPrefix,
		CaddyfilePath: '',
	}

	if (customizeOptions)
		customizeOptions(options)

	const generator = CreateGenerator(options)

	const caddyfileBytes = CaddyfileGenerator_GenerateCaddyfile(generator, compose)

	context.expect(expectedCaddyfile).toBe(caddyfileBytes)
}

export { testGeneration as _testGeneration }
