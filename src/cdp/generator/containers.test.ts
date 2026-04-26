import type { Compose } from '../../types'
import { describe, it } from 'vitest'
import { _testGeneration } from './generator.test'

describe('containers', () => {
	it('replicas', (context) => {
		const compose: Compose = {
			services: {
				service1: {
					labels: {
						'caddy': 'service.testdomain.com',
						'caddy.reverse_proxy': '{{upstreams}}',
					},
				},
				service2: {
					labels: {
						'caddy': 'service.testdomain.com',
						'caddy.reverse_proxy': '{{upstreams}}',
					},
				},
			},
		}

		const expectedCaddyfile = 'service.testdomain.com {\n'
			+ '	reverse_proxy <service1-1-ip> <service2-1-ip>\n'
			+ '}\n'

		_testGeneration(context, compose, undefined, expectedCaddyfile)
	})

	it('do not merge different proxies', (context) => {
		const compose: Compose = {
			services: {
				service1: {
					labels: {
						'caddy': 'service.testdomain.com',
						'caddy.reverse_proxy': '/a/* {{upstreams}}',
					},
				},
				service2: {
					labels: {
						'caddy': 'service.testdomain.com',
						'caddy.reverse_proxy': '/b/* {{upstreams}}',
					},
				},
			},
		}

		const expectedCaddyfile = 'service.testdomain.com {\n'
			+ '	reverse_proxy /a/* <service1-1-ip>\n'
			+ '	reverse_proxy /b/* <service2-1-ip>\n'
			+ '}\n'

		_testGeneration(context, compose, undefined, expectedCaddyfile)
	})

	it('complex merge', (context) => {
		const compose: Compose = {
			services: {
				service1: {
					labels: {
						'caddy': 'service.testdomain.com',
						'caddy.route': '/a/*',
						'caddy.route.0_uri': 'strip_prefix /a',
						'caddy.route.reverse_proxy': '{{upstreams}}',
						'caddy.route.reverse_proxy.health_uri': '/health',
						'caddy.redir': '/a /a1',
						'caddy.tls': 'internal',
					},
				},
				service2: {
					labels: {
						'caddy': 'service.testdomain.com',
						'caddy.route': '/b/*',
						'caddy.route.0_uri': 'strip_prefix /b',
						'caddy.route.reverse_proxy': '{{upstreams}}',
						'caddy.route.reverse_proxy.health_uri': '/health',
						'caddy.redir': '/b /b1',
						'caddy.tls': 'internal',
					},
				},
			},
		}

		const expectedCaddyfile = 'service.testdomain.com {\n'
			+ '	redir /a /a1\n'
			+ '	redir /b /b1\n'
			+ '	route /a/* {\n'
			+ '		uri strip_prefix /a\n'
			+ '		reverse_proxy <service1-1-ip> {\n'
			+ '			health_uri /health\n'
			+ '		}\n'
			+ '	}\n'
			+ '	route /b/* {\n'
			+ '		uri strip_prefix /b\n'
			+ '		reverse_proxy <service2-1-ip> {\n'
			+ '			health_uri /health\n'
			+ '		}\n'
			+ '	}\n'
			+ '	tls internal\n'
			+ '}\n'

		_testGeneration(context, compose, undefined, expectedCaddyfile)
	})

	it('with snippets', (context) => {
		const compose: Compose = {
			services: {
				service1: {
					labels: {
						'caddy': 'service.testdomain.com',
						'caddy.reverse_proxy': '{{upstreams}}',
						'caddy.import': 'mysnippet-1',
					},
				},
				service2: {
					labels: {
						'caddy_1': '(mysnippet-1)',
						'caddy_1.tls': 'internal',
						'caddy_2': '(mysnippet-2)',
						'caddy_2.tls': 'internal',
					},
				},
			},
		}

		const expectedCaddyfile = '(mysnippet-1) {\n'
			+ '	tls internal\n'
			+ '}\n'
			+ '(mysnippet-2) {\n'
			+ '	tls internal\n'
			+ '}\n'
			+ 'service.testdomain.com {\n'
			+ '	import mysnippet-1\n'
			+ '	reverse_proxy <service1-1-ip>\n'
			+ '}\n'

		_testGeneration(context, compose, undefined, expectedCaddyfile)
	})
})
