"use client"

import React, { useState, useRef, useEffect } from "react"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"

const DatePicker = React.forwardRef(({ value, min, max, onChange, className = "", ...props }, ref) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date(value))
  const containerRef = useRef(null)

  // Parse the date strings to Date objects
  const selectedDate = new Date(value)
  const minDate = min ? new Date(min) : null
  const maxDate = max ? new Date(max) : null

  // Format date for display
  const formatDisplayDate = (date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  // Handle click outside to close the calendar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Generate days for the current month view
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay()
  }

  const renderCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const daysInMonth = getDaysInMonth(year, month)
    const firstDayOfMonth = getFirstDayOfMonth(year, month)

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const isSelected = date.toDateString() === selectedDate.toDateString()
      const isDisabled = (minDate && date < minDate) || (maxDate && date > maxDate)

      days.push(
        <button
          key={day}
          type="button"
          disabled={isDisabled}
          className={`h-8 w-8 rounded-full flex items-center justify-center text-sm
              ${isSelected ? "bg-blue-500 text-white" : "hover:bg-gray-100"}
              ${isDisabled ? "text-gray-300 cursor-not-allowed" : "cursor-pointer"}
            `}
          onClick={() => handleDateSelect(date)}
        >
          {day}
        </button>,
      )
    }

    return days
  }

  // Handle date selection
  const handleDateSelect = (date) => {
    // Create a synthetic event object similar to what the input would provide
    const syntheticEvent = {
      target: {
        value: date.toISOString().split("T")[0],
      },
    }

    onChange(syntheticEvent)
    setIsOpen(false)
  }

  // Navigate to previous/next month
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`relative w-full cursor-pointer border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 ${className}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <div className="pl-7 text-gray-700">{formatDisplayDate(selectedDate)}</div>

        {/* Hidden input to maintain the same form behavior */}
        <input ref={ref} type="hidden" value={value} {...props} />
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-full">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="font-medium">
              {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </div>
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-full">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div key={day} className="h-8 w-8 flex items-center justify-center text-xs text-gray-500 font-medium">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">{renderCalendarDays()}</div>
        </div>
      )}
    </div>
  )
})

DatePicker.displayName = "DatePicker"

export default DatePicker

