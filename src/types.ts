export interface Compose {
	name?: string
	services?: {
		[k: string]: Service
	}
	[k: string]: unknown
}

export interface Service {
	container_name?: string
	deploy?: {
		replicas?: number | string
	}
	labels?:
		| {
			[k: string]: string | number | boolean | null
		}
		| string[]
	[k: string]: unknown
}
