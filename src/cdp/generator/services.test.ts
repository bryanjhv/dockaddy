import type { Compose } from '../../types'
import { describe, it } from 'vitest'
import { _testGeneration } from './generator.test'

describe('services', () => {
	it('template data', (context) => {
		const compose: Compose = {
			services: {
				service: {
					labels: {
						'caddy': 'service.testdomain.com',
						'caddy.reverse_proxy': '{{upstreams 5000}}',
						'caddy.reverse_proxy.health_uri': '/health',
						'caddy.gzip': '',
						'caddy.basicauth': '/ user password',
						'caddy.tls.dns': 'route53',
						'caddy.rewrite_0': '/path1 /path2',
						'caddy.rewrite_1': '/path3 /path4',
						'caddy.limits.header': '100kb',
						'caddy.limits.body_0': '/path1 2mb',
						'caddy.limits.body_1': '/path2 4mb',
					},
				},
			},
		}

		const expectedCaddyfile = 'service.testdomain.com {\n'
			+ '	basicauth / user password\n'
			+ '	gzip\n'
			+ '	limits {\n'
			+ '		body /path1 2mb\n'
			+ '		body /path2 4mb\n'
			+ '		header 100kb\n'
			+ '	}\n'
			+ '	reverse_proxy <service-1-ip>:5000 {\n'
			+ '		health_uri /health\n'
			+ '	}\n'
			+ '	rewrite /path1 /path2\n'
			+ '	rewrite /path3 /path4\n'
			+ '	tls {\n'
			+ '		dns route53\n'
			+ '	}\n'
			+ '}\n'

		_testGeneration(context, compose, undefined, expectedCaddyfile)
	})
})
