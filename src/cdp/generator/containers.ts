import type { ListOrDict, Service } from '../../types'
import type { Container } from '../caddyfile'
import type { CaddyfileGenerator } from './generator'
import { _CaddyfileGenerator_filterLabels } from './generator'
import { _labelsToCaddyfile } from './labels'

interface Context extends Service {
	composeName?: string
	name: string
}

function mergeLabels(target: Record<string, string>, src: ListOrDict | undefined) {
	if (!src)
		return
	if (Array.isArray(src)) {
		for (const label of src) {
			let parts = label.split('=')
			if (parts.length > 2)
				parts = [parts[0]!, parts.slice(1).join('=')]
			target[parts[0]!] = parts[1] ?? ''
		}
	}
	else {
		for (const [key, value] of Object.entries(src)) {
			target[key] = value === null ? '' : String(value)
		}
	}
}

function CaddyfileGenerator_getContainerCaddyfile(g: CaddyfileGenerator, container: Context): Container {
	const labels: Record<string, string> = {}
	mergeLabels(labels, container.labels)
	mergeLabels(labels, container.deploy?.labels)
	mergeLabels(labels, typeof container.build === 'object' ? container.build?.labels : undefined)

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
			const replicas = +(container.deploy?.replicas ?? container.scale ?? 1)
			for (let i = 1; i <= replicas; i++)
				names.push(`${name}-${i}`)
		}
		return names.map(name => `<${name}-ip>`)
	})
}

export { CaddyfileGenerator_getContainerCaddyfile as _CaddyfileGenerator_getContainerCaddyfile }
