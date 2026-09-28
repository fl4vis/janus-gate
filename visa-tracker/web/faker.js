// ESM
import { faker } from "@faker-js/faker"
import { execFileSync } from "node:child_process"

export function createRandomVisa() {
	return {
		name: faker.person.firstName(),
		lastname: faker.person.lastName(),
		application_id: faker.string.ulid(),
		ip: faker.internet.ipv4({ cidrBlock: "10.64.0.0/28" }),
		date: faker.date
			.between({
				from: "2026-01-01",
				to: new Date(),
			})
			.toISOString()
			.split("T")[0],
	}
}

export const visa = faker.helpers.multiple(createRandomVisa, {
	count: 300,
})

function sqlString(value) {
	return `'${value.replaceAll("'", "''")}'`
}

let values = visa
	.map(
		(v) => `
        (
        ${sqlString(v.name)},
        ${sqlString(v.lastname)},
        '${v.application_id}',
        '${v.ip}',
        '${v.date}'
        ),`,
	)
	.join("\n")

values = values.slice(0, -1) + ";"

const sql = `
	INSERT INTO visa (
		name,
		lastname,
		application_id,
		ip,
		date
	)
	VALUES
        ${values}
`

execFileSync("./sqlite3", ["./app.db"], {
	input: `
			BEGIN;
			${sql}
			COMMIT;
		`,
})
