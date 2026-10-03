import { useState } from "react"
import DateSearch from "./DateSearch"
import VisaData from "./VisaData"
import favicon from "./assets/favicon.svg"

function App() {
    const [date, setDate] = useState<Date>(new Date())

    return (
        <>
            <header className="visa-title">
                <img className="visa-title__favicon" src={favicon} alt="Visa Track" />
                <h1>DS Track</h1>
            </header>
            <DateSearch date={date} setDate={setDate} />
            <VisaData date={date} />
        </>
    )
}

export default App
