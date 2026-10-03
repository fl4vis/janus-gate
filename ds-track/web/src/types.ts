export type VisaData = {
	id: number
	name: string
	lastname: string
	dni: string
	application_id: string
	ip: string
	asesor: string
	date: string
}

export type VisaResponse = {
	data: VisaData[]
	next_cursor: number | null
}
