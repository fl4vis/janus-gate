import { useEffect, useState } from "react";
import type { VisaData, VisaResponse } from "./types";
import Table from "./Table";

type VisaDataParams = {
    date: Date
}

export default function VisaData({ date }: VisaDataParams) {
    const [visaData, setVisaData] = useState<VisaData[]>([])
    const [nextCursor, setNextCursor] = useState<number | null>(null)
    const [currentCursor, setCurrentCursor] = useState<number | undefined>(undefined)
    const [history, setHistory] = useState<(number | undefined)[]>([])

    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const PAGER: number = 20

    const fetchVisa = async (cursor?: number) => {
        const url = cursor
            ? `/visa?cursor=${cursor}&date=${formattedDate}`
            : `/visa?date=${formattedDate}`

        const response = await fetch(url)
        const result: VisaResponse = await response.json()

        console.log(result.data)

        if (result.data.length === 0) {
            setNextCursor(null)
            setHistory(prev => prev.slice(0, -1))
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

        setHistory(prev => [...prev, currentCursor])
        fetchVisa(nextCursor)
    }

    const prevPage = () => {
        if (history.length === 0) return

        const previousCursor = history[history.length - 1]
        setHistory(prev => prev.slice(0, -1))
        fetchVisa(previousCursor)
    }


    return (
        <>
            <Table visaData={visaData} />

            <div>
                <button disabled={history.length === 0} onClick={prevPage}>Prev Visa</button>
                <button disabled={nextCursor === null} onClick={nextPage}>Next Visa</button>
            </div>
        </>
    )
}
