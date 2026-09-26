import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type DateSearchProps = {
    date: Date
    setDate: React.Dispatch<React.SetStateAction<Date>>
};

export default function DateSearch({ date, setDate }: DateSearchProps) {

    return (
        <DatePicker
            selected={date}
            onChange={(date: Date | null) => {
                if (date) setDate(date)
            }}
            dateFormat="MM/yyyy"
            showMonthYearPicker
            placeholderText="Select month"
        />
    );
}
