export type VisaData = {
	id: number
	name: string
	lastname: string
	application_id: string
	ip: string
	date: string
}

export type VisaResponse = {
	data: VisaData[]
	next_cursor: number | null
}
