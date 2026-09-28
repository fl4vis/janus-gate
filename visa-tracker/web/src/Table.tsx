import { AllCommunityModule, colorSchemeDarkBlue, themeQuartz } from "ag-grid-community"
import { AgGridProvider, AgGridReact } from "ag-grid-react"
import type { ColDef } from "ag-grid-community"
import type { VisaData } from "./types"
const modules = [AllCommunityModule]
const darkGridTheme = themeQuartz.withPart(colorSchemeDarkBlue)

type TableProps = {
    visaData: VisaData[]
}

export default function Table({ visaData }: TableProps) {
    const columns: ColDef<VisaData>[] = [
        {
            headerName: "Name",
            valueGetter: (params) => `${params.data?.name ?? ""} ${params.data?.lastname ?? ""}`,
        },
        {
            headerName: "Application ID",
            field: "application_id",
        },
        {
            headerName: "IP",
            field: "ip",
            sortable: true,
            filter: true,
        },
        {
            headerName: "Date",
            field: "date",
            valueGetter: (params) => {
                const value = params.data?.date

                if (!value) return null

                const [year, month, day] = value.split("T")[0].split("-").map(Number)
                return new Date(year, month - 1, day)
            },

            valueFormatter: (params) => {
                if (!params.value) return ""

                return params.value.toLocaleDateString("es-EC", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                })
            },
            comparator: (dateA, dateB) => {
                if (!dateA && !dateB) return 0
                if (!dateA) return -1 // nulls first; swap to `1` for nulls last
                if (!dateB) return 1

                return dateA.getTime() - dateB.getTime()
            },
            filter: "agDateColumnFilter",
            sortable: true,
        },
    ]

    return (
        <AgGridProvider modules={modules}>
            <div className="visa-grid-shell" style={{ height: 500 }}>
                <AgGridReact rowData={visaData} columnDefs={columns} defaultColDef={{ flex: 1, minWidth: 140 }} theme={darkGridTheme} />
            </div>
        </AgGridProvider>
    )
}
