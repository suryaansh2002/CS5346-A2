"use client"

import { useState, useEffect } from "react"
import * as d3 from "d3"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronUp,
  Globe,
  Info,
  MapPin,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  Thermometer,
  Users,
  WormIcon as Virus,
} from "lucide-react"

const CovidDashboard = () => {
  // --- State Variables ---
  const [geoData, setGeoData] = useState(null)
  const [csvData, setCsvData] = useState([])
  const [dateRange, setDateRange] = useState({ min: null, max: null })
  // Store selectedDate as timestamp (number)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedMetric, setSelectedMetric] = useState("total_cases")
  // mode: "single" for only that date; "upto" for cumulative data up to that date.
  const [mode, setMode] = useState("single")
  const [showQueries, setShowQueries] = useState(false)
  const [showPurpose, setShowPurpose] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [countryList, setCountryList] = useState([])
  const [countryData, setCountryData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [globalStats, setGlobalStats] = useState({
    totalCases: 0,
    totalDeaths: 0,
    totalVaccinations: 0,
    recoveryRate: 0,
    fatalityRate: 0,
  })

  // --- Define metric options ---
  const metricOptions = [
    { value: "total_cases", label: "Total Cases", color: "#f87171", icon: <Virus className="w-5 h-5" /> },
    { value: "total_deaths", label: "Total Deaths", color: "#6b7280", icon: <AlertTriangle className="w-5 h-5" /> },
    {
      value: "new_cases_smoothed",
      label: "New Cases (7-day avg)",
      color: "#60a5fa",
      icon: <Activity className="w-5 h-5" />,
    },
    {
      value: "new_deaths_smoothed",
      label: "New Deaths (7-day avg)",
      color: "#4b5563",
      icon: <Activity className="w-5 h-5" />,
    },
    {
      value: "total_vaccinations",
      label: "Total Vaccinations",
      color: "#34d399",
      icon: <Thermometer className="w-5 h-5" />,
    },
    { value: "hosp_patients", label: "Hospitalized Patients", color: "#a78bfa", icon: <Users className="w-5 h-5" /> },
  ]

  // For "upto" mode, these fields are cumulative.
  const cumulativeMetrics = ["total_cases", "total_deaths", "total_vaccinations"]

  // --- Load world map GeoJSON ---
  useEffect(() => {
    setIsLoading(true)
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
      .then((data) => {
        setGeoData(data)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error("Error loading GeoJSON:", err)
        setIsLoading(false)
      })
  }, [])

  // --- Load CSV data from public folder ---
  useEffect(() => {
    setIsLoading(true)
    d3.csv("/owid-covid-data.csv")
      .then((data) => {
        // Convert date strings into Date objects and numeric fields to numbers.
        data.forEach((d) => {
          d.date = new Date(d.date)
          Object.keys(d).forEach((key) => {
            if (key !== "date" && key !== "iso_code" && key !== "continent" && key !== "location") {
              d[key] = d[key] === "" ? null : +d[key]
            }
          })
        })

        setCsvData(data)

        // Compute the full date range using d3.extent.
        const dates = data.map((d) => d.date.getTime())
        const [minTime, maxTime] = d3.extent(dates)
        const minDate = new Date(minTime)
        const maxDate = new Date(maxTime)
        setDateRange({ min: minDate, max: maxDate })

        // Set default selected date as the latest available.
        setSelectedDate(maxTime)

        // Extract unique countries.
        const countries = [...new Set(data.map((d) => d.location))].sort()
        setCountryList(countries)
        if (countries.length > 0) {
          setSelectedCountry(countries.find((c) => c === "World") || countries[0])
        }

        // Calculate global statistics based on the selected date.
        updateGlobalStats(data, maxTime)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error("Error loading CSV:", err)
        setIsLoading(false)
      })
  }, [])

  // --- Recalculate country-specific data when selected country or csvData changes ---
  useEffect(() => {
    if (selectedCountry && csvData.length > 0) {
      const countrySpecificData = csvData.filter((d) => d.location === selectedCountry)
      countrySpecificData.sort((a, b) => a.date - b.date)
      setCountryData(countrySpecificData)
    }
  }, [selectedCountry, csvData])

  // --- Recalculate global stats when selectedDate, mode, or csvData change ---
  useEffect(() => {
    if (csvData.length > 0 && selectedDate) {
      updateGlobalStats(csvData, selectedDate)
    }
  }, [csvData, selectedDate, mode])

  // --- Helper: Update global statistics based on selected date ---
  const updateGlobalStats = (data, dateTimestamp) => {
    const selDateObj = new Date(dateTimestamp)
    const selStr = selDateObj.toISOString().slice(0, 10)
    const filtered = data.filter((d) => d.date.toISOString().slice(0, 10) === selStr)
    const worldData = filtered.find((d) => d.location === "World")

    if (worldData) {
      setGlobalStats({
        totalCases: worldData.total_cases || 0,
        totalDeaths: worldData.total_deaths || 0,
        totalVaccinations: worldData.total_vaccinations || 0,
        recoveryRate:
          worldData.total_cases && worldData.total_deaths
            ? ((worldData.total_cases - worldData.total_deaths) / worldData.total_cases) * 100
            : 0,
        fatalityRate:
          worldData.total_cases && worldData.total_deaths ? (worldData.total_deaths / worldData.total_cases) * 100 : 0,
      })
    } else {
      // Aggregate across countries if no "World" row.
      const totalCases = d3.sum(filtered, (d) => d.total_cases || 0)
      const totalDeaths = d3.sum(filtered, (d) => d.total_deaths || 0)
      const totalVaccinations = d3.sum(filtered, (d) => d.total_vaccinations || 0)
      setGlobalStats({
        totalCases,
        totalDeaths,
        totalVaccinations,
        recoveryRate: totalCases ? ((totalCases - totalDeaths) / totalCases) * 100 : 0,
        fatalityRate: totalCases ? (totalDeaths / totalCases) * 100 : 0,
      })
    }
  }

  // --- Helper: Map country names between GeoJSON and CSV ---
  const mapCountryName = (name) => {
    const mapping = {
      "United States of America": "United States",
      USA: "United States",
      UK: "United Kingdom",
      Russia: "Russian Federation",
      "South Korea": "Korea, Rep.",
      "North Korea": "Korea, Dem. People's Rep.",
      Turkey: "Turkiye",
      // Add other mappings as needed...
    }
    return mapping[name] || name
  }

  // --- Helper: Return a human-friendly metric label ---
  const getMetricLabel = (metric) => {
    const found = metricOptions.find((opt) => opt.value === metric)
    return found ? found.label : metric
  }

  // --- Helper: Get metric color and icon ---
  const getMetricColor = (metric) => {
    const found = metricOptions.find((opt) => opt.value === metric)
    return found ? found.color : "#6b7280"
  }
  const getMetricIcon = (metric) => {
    const found = metricOptions.find((opt) => opt.value === metric)
    return found ? found.icon : <Info className="w-5 h-5" />
  }

  // --- Helper: Format a numeric value for display ---
  const formatValue = (value, precision = 1) => {
    if (value === undefined || value === null || isNaN(value)) return "No data"
    if (value > 1e9) return (value / 1e9).toFixed(precision) + "B"
    if (value > 1e6) return (value / 1e6).toFixed(precision) + "M"
    if (value > 1e3) return (value / 1e3).toFixed(precision) + "K"
    return Number.parseFloat(value).toFixed(precision)
  }

  // --- Helper: Format a percentage ---
  const formatPercent = (value, precision = 2) => {
    if (value === undefined || value === null || isNaN(value)) return "No data"
    return Number.parseFloat(value).toFixed(precision) + "%"
  }

  // --- Compute metric data per country based on the selected date and mode ---
  const computeMetricData = () => {
    const result = {}
    if (csvData.length === 0) return result
    const selDateObj = new Date(selectedDate)
    const selStr = selDateObj.toISOString().slice(0, 10)

    if (mode === "single") {
      csvData.forEach((row) => {
        const rowStr = row.date.toISOString().slice(0, 10)
        if (rowStr === selStr) {
          const country = row.location
          const val = row[selectedMetric]
          if (val !== null && !isNaN(val)) result[country] = val
        }
      })
    } else {
      const groups = {}
      csvData.forEach((row) => {
        if (row.date <= selDateObj) {
          const country = row.location
          if (!groups[country]) groups[country] = []
          groups[country].push(row)
        }
      })
      Object.entries(groups).forEach(([country, rows]) => {
        if (cumulativeMetrics.includes(selectedMetric)) {
          const latestRow = rows.reduce((a, b) => (a.date > b.date ? a : b))
          const val = latestRow[selectedMetric]
          if (val !== null && !isNaN(val)) result[country] = val
        } else {
          const sum = rows.reduce((acc, row) => {
            const v = row[selectedMetric]
            return acc + (v === null || isNaN(v) ? 0 : v)
          }, 0)
          result[country] = sum
        }
      })
    }
    return result
  }

  // --- Compute a global KPI (aggregate across countries) ---
  const computeGlobalKPI = (dataMap) => {
    let total = 0
    Object.values(dataMap).forEach((val) => {
      if (typeof val === "number" && !isNaN(val)) total += val
    })
    return total
  }

  // --- Get top affected countries (excluding "World") ---
  const getTopCountries = (dataMap, limit = 5) => {
    return Object.entries(dataMap)
      .filter(([country, value]) => country !== "World" && value !== null && !isNaN(value))
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([country, value]) => ({ country, value }))
  }

  // --- Prepare data for the comparison bar chart ---
  const prepareComparisonData = (countries, metric) => {
    if (!selectedDate) return []
    const selStr = new Date(selectedDate).toISOString().slice(0, 10)
    return countries.map((country) => {
      const countryDataRow = csvData.find((d) => d.location === country && d.date.toISOString().slice(0, 10) === selStr)
      return {
        country,
        value: countryDataRow ? countryDataRow[metric] : 0,
      }
    })
  }

  // --- Prepare data for time series charts (last N non-zero days) ---
  const prepareTimeSeriesData = (countryData, metric, limit = 30) => {
    if (!countryData.length) return []
    // Filter for rows where the metric is non-zero and non-null.
    const filtered = countryData.filter((d) => d[metric] && d[metric] !== 0)
    if (!filtered.length) return []
    const sorted = filtered.sort((a, b) => a.date - b.date)
    const recent = sorted.slice(-limit)
    return recent.map((d) => ({
      date: d.date.toISOString().slice(0, 10),
      value: d[metric] || 0,
    }))
  }

  // --- Calculate percentage change for KPI cards ---
  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return { value: 0, increase: false }
    const change = ((current - previous) / previous) * 100
    return { value: Math.abs(change), increase: change > 0 }
  }

  // --- Get previous day's global KPI based on selected metric and date ---
  const getPreviousDayKPI = () => {
    if (!selectedDate || csvData.length === 0) return null
    const currentDate = new Date(selectedDate)
    const previousDate = new Date(currentDate)
    previousDate.setDate(previousDate.getDate() - 1)
    const prevStr = previousDate.toISOString().slice(0, 10)
    const prevData = {}
    csvData.forEach((row) => {
      if (row.date.toISOString().slice(0, 10) === prevStr) {
        const country = row.location
        const val = row[selectedMetric]
        if (val !== null && !isNaN(val)) prevData[country] = val
      }
    })
    return computeGlobalKPI(prevData)
  }

  const metricData = computeMetricData()
  const globalKPI = computeGlobalKPI(metricData)
  const previousDayKPI = getPreviousDayKPI()
  const kpiChange = calculateChange(globalKPI, previousDayKPI)
  // Note: The Top Countries Chart section has been removed as requested.
  const timeSeriesData = prepareTimeSeriesData(countryData, selectedMetric)

  // --- Draw the heatmap using D3 ---
  useEffect(() => {
    if (!geoData || csvData.length === 0 || !selectedDate) return

    const metricData = computeMetricData()
    d3.select("#map-container").selectAll("*").remove()

    const container = document.getElementById("map-container")
    const width = container.clientWidth
    const height = 500

    const svg = d3
      .select("#map-container")
      .append("svg")
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")

    const g = svg.append("g")

    // Create a Mercator projection.
    const projection = d3
      .geoMercator()
      .scale(width / 6.5)
      .center([0, 20])
      .translate([width / 2, height / 2])
    const path = d3.geoPath().projection(projection)

    const values = Object.values(metricData).filter((v) => v !== null && !isNaN(v))
    const minValue = values.length ? d3.min(values) : 0
    const maxValue = values.length ? d3.max(values) : 1

    const colorScale = d3.scaleSequential().domain([minValue, maxValue]).interpolator(d3.interpolateReds)

    // Add zoom functionality.
    const zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
      })
    svg.call(zoom)

    // Draw countries.
    g.selectAll("path")
      .data(geoData.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", (d) => {
        const countryName = d.properties.name
        const mappedName = mapCountryName(countryName)
        const val = metricData[mappedName]
        return val !== undefined && val !== null && !isNaN(val) ? colorScale(val) : "#e5e7eb"
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .attr("class", "country-path")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("stroke-width", 1.5).attr("stroke", "#333")
        const countryName = d.properties.name
        const mappedName = mapCountryName(countryName)
        const val = metricData[mappedName]
        // Append a note if mode is "upto" and the metric is non-cumulative.
        const extraText =
          mode === "upto" && !cumulativeMetrics.includes(selectedMetric)
            ? " (cumulative)"
            : ""
        d3.select("#tooltip")
          .style("opacity", 1)
          .html(`
            <div class="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
              <h3 class="font-bold text-gray-800">${countryName}</h3>
              <div class="flex items-center mt-1 text-gray-700">
                <span>${getMetricLabel(selectedMetric)}:</span>
                <span class="ml-2 font-semibold">${formatValue(val)}${extraText}</span>
              </div>
            </div>
          `)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px")
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke-width", 0.5).attr("stroke", "#fff")
        d3.select("#tooltip").style("opacity", 0)
      })
      .on("click", (event, d) => {
        const countryName = d.properties.name
        const mappedName = mapCountryName(countryName)
        if (countryList.includes(mappedName)) {
          setSelectedCountry(mappedName)
          document.getElementById("country-section")?.scrollIntoView({ behavior: "smooth" })
        }
      })

    // Legend.
    const legendWidth = 200
    const legendHeight = 20
    const legend = svg.append("g").attr("transform", `translate(${width - legendWidth - 20}, ${height - 50})`)
    const defs = svg.append("defs")
    const gradient = defs
      .append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%")
    gradient.append("stop").attr("offset", "0%").attr("stop-color", colorScale(minValue))
    gradient.append("stop").attr("offset", "100%").attr("stop-color", colorScale(maxValue))
    legend
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)")
      .style("stroke", "#ccc")
      .style("stroke-width", 0.5)
    legend
      .append("text")
      .attr("x", 0)
      .attr("y", legendHeight + 15)
      .style("text-anchor", "start")
      .style("font-size", "12px")
      .text(formatValue(minValue))
    legend
      .append("text")
      .attr("x", legendWidth)
      .attr("y", legendHeight + 15)
      .style("text-anchor", "end")
      .style("font-size", "12px")
      .text(formatValue(maxValue))
    legend
      .append("text")
      .attr("x", legendWidth / 2)
      .attr("y", -5)
      .style("text-anchor", "middle")
      .style("font-weight", "bold")
      .style("font-size", "12px")
      .text(getMetricLabel(selectedMetric))

    // Zoom controls.
    const zoomControls = svg.append("g").attr("transform", `translate(20, ${height - 60})`)
    zoomControls
      .append("rect")
      .attr("width", 30)
      .attr("height", 30)
      .attr("rx", 4)
      .attr("fill", "white")
      .attr("stroke", "#ccc")
      .attr("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(500).call(zoom.scaleBy, 1.5)
      })
    zoomControls
      .append("text")
      .attr("x", 15)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("fill", "#333")
      .attr("pointer-events", "none")
      .text("+")
    zoomControls
      .append("rect")
      .attr("width", 30)
      .attr("height", 30)
      .attr("rx", 4)
      .attr("y", 35)
      .attr("fill", "white")
      .attr("stroke", "#ccc")
      .attr("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(500).call(zoom.scaleBy, 0.75)
      })
    zoomControls
      .append("text")
      .attr("x", 15)
      .attr("y", 55)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("fill", "#333")
      .attr("pointer-events", "none")
      .text("−")
    zoomControls
      .append("rect")
      .attr("width", 30)
      .attr("height", 30)
      .attr("rx", 4)
      .attr("y", 70)
      .attr("fill", "white")
      .attr("stroke", "#ccc")
      .attr("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity)
      })
    zoomControls
      .append("text")
      .attr("x", 15)
      .attr("y", 90)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#333")
      .attr("pointer-events", "none")
      .text("Reset")
  }, [geoData, csvData, selectedDate, selectedMetric, mode, countryList])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Virus className="w-8 h-8 mr-3 text-red-500" />
                COVID‑19 Global Dashboard
              </h1>
              <p className="mt-1 text-gray-600">Visualizing the impact of the COVID‑19 pandemic across the globe</p>
            </div>
            <button
              onClick={() => setShowPurpose(!showPurpose)}
              className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              {showPurpose ? (
                <>
                  <Minimize2 className="w-4 h-4 mr-1" />
                  Hide Purpose
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 mr-1" />
                  Show Purpose
                </>
              )}
            </button>
          </div>
          {showPurpose && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 text-blue-800">
              <h2 className="text-lg font-semibold mb-2">Dashboard Purpose</h2>
              <p className="mb-2">
                This dashboard serves as a comprehensive tool for public health officials, policymakers, and researchers to monitor and analyze the global impact of COVID‑19.
              </p>
              <p>
                Interactive features and detailed country-specific analysis enable users to identify trends, compare regional impacts, and make data‑driven decisions.
              </p>
            </div>
          )}
          <div className="mt-4">
            <button
              onClick={() => setShowQueries(!showQueries)}
              className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              {showQueries ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Hide Research Questions
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Show Research Questions
                </>
              )}
            </button>
            {showQueries && (
              <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-2">Key Questions This Dashboard Answers:</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>How has the global distribution of COVID‑19 cases evolved over time?</li>
                  <li>Which countries have been most severely affected?</li>
                  <li>What is the relationship between vaccination rates and case/death numbers?</li>
                  <li>How do hospitalization rates correlate with mortality rates?</li>
                  <li>What are the temporal patterns in case surges and declines?</li>
                  <li>How effective have different countries been in controlling COVID‑19?</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-lg text-gray-700">Loading data...</span>
          </div>
        ) : (
          <>
            {/* Global KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {/* Total Cases */}
              <div className="bg-white rounded-lg shadow p-5 border-l-4 border-red-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Virus className="w-4 h-4 mr-1 text-red-500" />
                      Total Cases
                    </p>
                    <h3 className="mt-1 text-2xl font-bold text-gray-900">{formatValue(globalStats.totalCases)}</h3>
                  </div>
                  <div className={`flex items-center text-sm ${globalStats.totalCases > 0 ? "text-red-500" : "text-green-500"}`}>
                    {globalStats.totalCases > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    <span className="ml-1">{formatPercent(kpiChange.value)}</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">Compared to previous day</div>
              </div>

              {/* Total Deaths */}
              <div className="bg-white rounded-lg shadow p-5 border-l-4 border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-1 text-gray-700" />
                      Total Deaths
                    </p>
                    <h3 className="mt-1 text-2xl font-bold text-gray-900">{formatValue(globalStats.totalDeaths)}</h3>
                  </div>
                  <div className="flex items-center text-sm text-red-500">
                    <ArrowUp className="w-4 h-4" />
                    <span className="ml-1">{formatPercent(globalStats.fatalityRate)}</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">Case fatality rate</div>
              </div>

              {/* Total Vaccinations */}
              <div className="bg-white rounded-lg shadow p-5 border-l-4 border-green-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Thermometer className="w-4 h-4 mr-1 text-green-500" />
                      Vaccinations
                    </p>
                    <h3 className="mt-1 text-2xl font-bold text-gray-900">{formatValue(globalStats.totalVaccinations)}</h3>
                  </div>
                  <div className="flex items-center text-sm text-green-500">
                    <ArrowUp className="w-4 h-4" />
                    <span className="ml-1">{formatPercent((globalStats.totalVaccinations / (globalStats.totalCases || 1)) * 100)}</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">Vaccines per case</div>
              </div>

              {/* Recovery Rate */}
              <div className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Activity className="w-4 h-4 mr-1 text-blue-500" />
                      Recovery Rate
                    </p>
                    <h3 className="mt-1 text-2xl font-bold text-gray-900">{formatPercent(globalStats.recoveryRate)}</h3>
                  </div>
                  <div className="flex items-center text-sm text-green-500">
                    <ArrowUp className="w-4 h-4" />
                    <span className="ml-1">Positive</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">Estimated from cases vs deaths</div>
              </div>

              {/* Selected Metric Global KPI */}
              <div
                className="bg-white rounded-lg shadow p-5 border-l-4"
                style={{ borderColor: getMetricColor(selectedMetric) }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      {getMetricIcon(selectedMetric)}
                      <span className="ml-1">{getMetricLabel(selectedMetric)}</span>
                    </p>
                    <h3 className="mt-1 text-2xl font-bold text-gray-900">{formatValue(globalKPI)}</h3>
                  </div>
                  <div className={`flex items-center text-sm ${kpiChange.increase ? "text-red-500" : "text-green-500"}`}>
                    {kpiChange.increase ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    <span className="ml-1">{formatPercent(kpiChange.value)}</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">Global aggregate</div>
              </div>
            </div>

            {/* Controls Section */}
            <div className="bg-white rounded-lg shadow-md mb-8">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <Globe className="w-5 h-5 mr-2" />
                  Global COVID‑19 Distribution
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {/* Metric Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Metric</label>
                    <select
                      value={selectedMetric}
                      onChange={(e) => setSelectedMetric(e.target.value)}
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {metricOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Display Mode */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Mode</label>
                    <div className="flex space-x-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="mode"
                          value="single"
                          checked={mode === "single"}
                          onChange={() => setMode("single")}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Single date</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="mode"
                          value="upto"
                          checked={mode === "upto"}
                          onChange={() => setMode("upto")}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Cumulative to date</span>
                      </label>
                    </div>
                  </div>

                  {/* Date Display */}
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-gray-500 mr-2" />
                    <div>
                      <span className="block text-sm font-medium text-gray-700">Selected Date</span>
                      <span className="text-lg font-semibold text-gray-900">
                        {selectedDate
                          ? new Date(selectedDate).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Date Slider */}
                <div className="mb-2">
                  <input
                    type="range"
                    min={dateRange.min ? dateRange.min.getTime() : 0}
                    max={dateRange.max ? dateRange.max.getTime() : 0}
                    value={selectedDate || (dateRange.max ? dateRange.max.getTime() : 0)}
                    onChange={(e) => setSelectedDate(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{dateRange.min ? new Date(dateRange.min).toLocaleDateString() : ""}</span>
                    <span>{dateRange.max ? new Date(dateRange.max).toLocaleDateString() : ""}</span>
                  </div>
                </div>

                {/* Map Legend */}
                <div className="flex items-center text-sm text-gray-500 mt-4">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>Click on a country to view detailed data</span>
                </div>
              </div>
              <div id="map-container" className="h-[500px] w-full relative border-t border-gray-200"></div>
              <div
                id="tooltip"
                className="absolute bg-white p-2 rounded shadow border pointer-events-none opacity-0 transition-opacity"
                style={{ zIndex: 10 }}
              ></div>
            </div>

            {/* Country-Specific Analysis Section */}
            <div id="country-section" className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Country-Specific Analysis
              </h2>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Country</label>
                <div className="relative">
                  <select
                    value={selectedCountry || ""}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 pl-3 pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {countryList.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <Search className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {selectedCountry && countryData.length > 0 && (
                <>
                  {/* Country KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-sm text-gray-500">Total Cases</p>
                      <h3 className="font-semibold">{formatValue(countryData[countryData.length - 1]?.total_cases)}</h3>
                      <p className="text-xs text-gray-500">{formatValue(countryData[countryData.length - 1]?.total_cases_per_million)} per million</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-sm text-gray-500">Total Deaths</p>
                      <h3 className="font-semibold">{formatValue(countryData[countryData.length - 1]?.total_deaths)}</h3>
                      <p className="text-xs text-gray-500">{formatValue(countryData[countryData.length - 1]?.total_deaths_per_million)} per million</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-sm text-gray-500">Vaccinations</p>
                      <h3 className="font-semibold">{formatValue(countryData[countryData.length - 1]?.total_vaccinations)}</h3>
                      <p className="text-xs text-gray-500">{formatValue(countryData[countryData.length - 1]?.people_vaccinated_per_hundred)}% of population</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-sm text-gray-500">Hospitalized</p>
                      <h3 className="font-semibold">{formatValue(countryData[countryData.length - 1]?.hosp_patients)}</h3>
                      <p className="text-xs text-gray-500">{formatValue(countryData[countryData.length - 1]?.hosp_patients_per_million)} per million</p>
                    </div>
                  </div>

                  {/* Country Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Time Series Chart */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-lg font-medium text-gray-800 mb-4">
                        {getMetricLabel(selectedMetric)} Trend (Last 30 non-zero days)
                      </h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={prepareTimeSeriesData(countryData, selectedMetric)} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                            <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={getMetricColor(selectedMetric)} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={getMetricColor(selectedMetric)} stopOpacity={0.1} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                            <YAxis tickFormatter={(value) => formatValue(value)} tick={{ fontSize: 10 }} />
                            <RechartsTooltip
                              formatter={(value) => [formatValue(value, 2), getMetricLabel(selectedMetric)]}
                              labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                            />
                            <Area type="monotone" dataKey="value" stroke={getMetricColor(selectedMetric)} fillOpacity={1} fill="url(#colorValue)" animationDuration={1000} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* New Cases vs New Deaths Chart */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-lg font-medium text-gray-800 mb-4">New Cases vs New Deaths (7-day avg)</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={prepareTimeSeriesData(countryData, "new_cases_smoothed").map((d) => {
                              const dayData = countryData.find((cd) => cd.date.toISOString().slice(0, 10) === d.date)
                              return {
                                date: d.date,
                                newCases: dayData?.new_cases_smoothed || 0,
                                newDeaths: dayData?.new_deaths_smoothed || 0,
                              }
                            })}
                            margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                            <YAxis yAxisId="left" tickFormatter={(value) => formatValue(value)} tick={{ fontSize: 10 }} />
                            <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => formatValue(value)} tick={{ fontSize: 10 }} />
                            <RechartsTooltip
                              formatter={(value, name) => {
                                if (name === "newCases") return [formatValue(value, 2), "New Cases (7-day avg)"]
                                if (name === "newDeaths") return [formatValue(value, 2), "New Deaths (7-day avg)"]
                                return [value, name]
                              }}
                              labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                            />
                            <Legend
                              payload={[
                                { value: "New Cases (7-day avg)", type: "line", color: "#60a5fa" },
                                { value: "New Deaths (7-day avg)", type: "line", color: "#6b7280" },
                              ]}
                            />
                            <Line yAxisId="left" type="monotone" dataKey="newCases" stroke="#60a5fa" activeDot={{ r: 8 }} animationDuration={1000} />
                            <Line yAxisId="right" type="monotone" dataKey="newDeaths" stroke="#6b7280" animationDuration={1000} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Vaccination Progress Chart */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="text-lg font-medium text-gray-800 mb-4">Vaccination Progress</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              {
                                name: "Fully Vaccinated",
                                value: countryData[countryData.length - 1]?.people_fully_vaccinated_per_hundred || 0,
                              },
                              {
                                name: "Partially Vaccinated",
                                value:
                                  (countryData[countryData.length - 1]?.people_vaccinated_per_hundred || 0) -
                                  (countryData[countryData.length - 1]?.people_fully_vaccinated_per_hundred || 0),
                              },
                              {
                                name: "Boosters",
                                value: countryData[countryData.length - 1]?.total_boosters_per_hundred || 0,
                              },
                            ]}
                            layout="vertical"
                            margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                            <YAxis dataKey="name" type="category" scale="band" />
                            <RechartsTooltip formatter={(value) => [`${value.toFixed(2)}%`, "Percentage"]} />
                            <Bar dataKey="value" animationDuration={1000}>
                              {[
                                { name: "Fully Vaccinated", color: "#34d399" },
                                { name: "Partially Vaccinated", color: "#60a5fa" },
                                { name: "Boosters", color: "#a78bfa" },
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Country Demographics */}
                  <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Country Demographics & Risk Factors</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Population</p>
                        <p className="font-semibold">{formatValue(countryData[0]?.population)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Population Density</p>
                        <p className="font-semibold">{formatValue(countryData[0]?.population_density)} per km²</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Median Age</p>
                        <p className="font-semibold">{formatValue(countryData[0]?.median_age)} years</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">GDP per Capita</p>
                        <p className="font-semibold">${formatValue(countryData[0]?.gdp_per_capita)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Aged 65+</p>
                        <p className="font-semibold">{formatValue(countryData[0]?.aged_65_older)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Diabetes Prevalence</p>
                        <p className="font-semibold">{formatValue(countryData[0]?.diabetes_prevalence)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Hospital Beds</p>
                        <p className="font-semibold">{formatValue(countryData[0]?.hospital_beds_per_thousand)} per 1,000</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Life Expectancy</p>
                        <p className="font-semibold">{formatValue(countryData[0]?.life_expectancy)} years</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm text-gray-500">Data source: Our World in Data COVID‑19 dataset</p>
              <p className="text-xs text-gray-400 mt-1">Last updated: {dateRange.max ? dateRange.max.toLocaleDateString() : ""}</p>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <ArrowUp className="w-4 h-4 mr-1" />
                Back to top
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 ml-6"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh data
              </button>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-400 text-center">
            <p>
              This dashboard is designed for educational and research purposes. For official COVID‑19 information,
              please consult your local health authorities.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default CovidDashboard
