import { useState } from "react";
import DateSearch from "./DateSearch";
import VisaData from "./VisaData";

function App() {
    const [date, setDate] = useState<Date>(new Date());

    return (
        <>
            <h1>Visa</h1>
            <DateSearch date={date} setDate={setDate} />
            <br />
            <br />
            <br />
            <br />
            <VisaData date={date} />
        </>
    )
}

export default App
