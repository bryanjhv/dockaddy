import type { _FuncMap, Container } from '../caddyfile'
import { FromLabels } from '../caddyfile'

type targetsProvider = () => string[]

function labelsToCaddyfile(labels: Record<string, string>, templateData: unknown, getTargets: targetsProvider): Container {
	const funcMap: _FuncMap = {}
	funcMap['upstreams'] = (...options: unknown[]) => {
		const targets = getTargets()
		targets.sort()
		const transformed: string[] = []
		for (let target of targets) {
			for (const param of options) {
				if (typeof param === 'string')
					target = `${param}://${target}`
				else if (typeof param === 'number')
					target = `${target}:${param}`
			}
			transformed.push(target)
		}
		transformed.sort()
		return transformed.join(' ')
	}
	funcMap['http'] = () => 'http'
	funcMap['https'] = () => 'https'
	funcMap['h2c'] = () => 'h2c'

	return FromLabels(labels, templateData, funcMap)
}

export { labelsToCaddyfile as _labelsToCaddyfile }
