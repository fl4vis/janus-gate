import { useEffect, useState } from "react"
import type { VisaData, VisaResponse } from "./types"
import Table from "./Table"

type VisaDataParams = {
    date: Date
}

export default function VisaData({ date }: VisaDataParams) {
    const [visaData, setVisaData] = useState<VisaData[]>([])
    const [nextCursor, setNextCursor] = useState<number | null>(null)
    const [currentCursor, setCurrentCursor] = useState<number | undefined>(undefined)
    const [history, setHistory] = useState<(number | undefined)[]>([])

    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    const PAGER: number = 20

    const fetchVisa = async (cursor?: number) => {
        const url = cursor
            ? `/visa?cursor=${cursor}&date=${formattedDate}`
            : `/visa?date=${formattedDate}`

        const response = await fetch(url)
        const result: VisaResponse = await response.json()

        if (result.data.length === 0) {
            setNextCursor(null)
            setHistory((prev) => prev.slice(0, -1))
            setVisaData([])
            return
        }

        setVisaData(result.data)
        setCurrentCursor(cursor)
        setNextCursor(result.data.length < PAGER ? null : result.next_cursor)
    }

    useEffect(() => {
        fetchVisa()
    }, [date])

    const nextPage = () => {
        if (nextCursor === null) return

        setHistory((prev) => [...prev, currentCursor])
        fetchVisa(nextCursor)
    }

    const prevPage = () => {
        if (history.length === 0) return

        const previousCursor = history[history.length - 1]
        setHistory((prev) => prev.slice(0, -1))
        fetchVisa(previousCursor)
    }

    return (
        <div className="visa-data">
            <Table visaData={visaData} />

            <div className="visa-pagination">
                <button className="visa-pagination__button" disabled={history.length === 0} onClick={prevPage}>
                    Prev
                </button>
                <button className="visa-pagination__button visa-pagination__button--next" disabled={nextCursor === null} onClick={nextPage}>
                    Next
                </button>
            </div>
        </div>
    )
}
