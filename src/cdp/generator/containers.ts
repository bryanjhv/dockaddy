import type { Service } from '../../types'
import type { Container } from '../caddyfile'
import type { CaddyfileGenerator } from './generator'
import { _CaddyfileGenerator_filterLabels } from './generator'
import { _labelsToCaddyfile } from './labels'

interface Context extends Service {
	composeName?: string
	name: string
}

function CaddyfileGenerator_getContainerCaddyfile(g: CaddyfileGenerator, container: Context): Container {
	const labels: Record<string, string> = {}
	if (Array.isArray(container.labels)) {
		for (const label of container.labels) {
			let parts = label.split('=')
			if (parts.length > 2)
				parts = [parts[0]!, parts.slice(1).join('=')]
			labels[parts[0]!] = parts[1] ?? ''
		}
	}
	else if (container.labels) {
		for (const [key, value] of Object.entries(container.labels)) {
			if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
				labels[key] = String(value)
			if (value === null)
				labels[key] = ''
		}
	}

	const caddyLabels = _CaddyfileGenerator_filterLabels(g, labels)

	return _labelsToCaddyfile(caddyLabels, null, () => {
		const names: string[] = []
		if (container.container_name) {
			names.push(container.container_name)
		}
		else {
			let name = container.name
			if (container.composeName)
				name = `${container.composeName}-${name}`
			const replicas = +(container.deploy?.replicas ?? 1)
			for (let i = 1; i <= replicas; i++)
				names.push(`${name}-${i}`)
		}
		return names.map(name => `<${name}-ip>`)
	})
}

export { CaddyfileGenerator_getContainerCaddyfile as _CaddyfileGenerator_getContainerCaddyfile }
