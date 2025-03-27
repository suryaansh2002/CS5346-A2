import React, { useState, useEffect } from 'react';
import * as d3 from 'd3';

const CovidDashboard = () => {
  // --- State Variables ---
  const [geoData, setGeoData] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [dateRange, setDateRange] = useState({ min: null, max: null });
  // Store selectedDate as timestamp (number)
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState("total_cases");
  // mode: "single" for data on that date; "upto" for cumulative data up to that date.
  const [mode, setMode] = useState("single");

  // --- Define metric options for the dropdown ---
  const metricOptions = [
    { value: "total_cases", label: "Total Cases" },
    { value: "total_deaths", label: "Total Deaths" },
    { value: "new_cases_smoothed", label: "New Cases (7-day smoothed)" },
    { value: "new_deaths_smoothed", label: "New Deaths (7-day smoothed)" },
    { value: "total_vaccinations", label: "Total Vaccinations" }
  ];
  // For "upto" mode: these metrics are cumulative so we take the latest available value.
  const cumulativeMetrics = ["total_cases", "total_deaths", "total_vaccinations"];

  // --- Load world map GeoJSON ---
  useEffect(() => {
    d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
      .then(data => setGeoData(data))
      .catch(err => console.error("Error loading GeoJSON:", err));
  }, []);

  // --- Load CSV data from the public folder ---
  useEffect(() => {
    d3.csv('/owid-covid-data.csv')
      .then(data => {
        // Convert date strings into Date objects.
        data.forEach(d => {
          d.date = new Date(d.date);
        });
        setCsvData(data);
        // Compute full date range safely using d3.extent.
        const dates = data.map(d => d.date.getTime());
        const [minTime, maxTime] = d3.extent(dates);
        console.log(minTime, maxTime);
        setDateRange({ min: new Date(minTime), max: new Date(maxTime) });
        // Set default selected date as the latest available.
        setSelectedDate(maxTime);
      })
      .catch(err => console.error("Error loading CSV:", err));
  }, []);

  // --- Helper: Map country names between GeoJSON (properties.name) and CSV (location) ---
  const mapCountryName = (name) => {
    const mapping = {
      "United States of America": "United States",
      "USA": "United States",
      "UK": "United Kingdom",
      "Russia": "Russian Federation",
      "South Korea": "Korea, Rep.",
      "North Korea": "Korea, Dem. People's Rep.",
      "Turkey": "Turkiye"
      // Add additional mappings as needed...
    };
    return mapping[name] || name;
  };

  // --- Helper: Format a value for display on the heatmap and in KPI cards ---
  const formatValue = (value, metric) => {
    if (value === undefined || value === null || isNaN(value)) {
      return "No data";
    }
    // If the metric key contains "pct", show percentage.
    if (metric.includes("pct")) {
      return parseFloat(value).toFixed(1) + "%";
    }
    return parseFloat(value).toFixed(1);
  };

  // --- Helper: Return a human-friendly metric name ---
  const formatMetricName = (metric) => {
    const found = metricOptions.find(opt => opt.value === metric);
    return found ? found.label : metric;
  };

  // --- Compute metric data per country based on the selected date and mode ---
  const computeMetricData = () => {
    const result = {};
    if (csvData.length === 0) return result;
    const selDateObj = new Date(selectedDate);
    if (mode === "single") {
      // Use rows that match exactly the selected date (comparing yyyy-mm-dd strings)
      const selStr = selDateObj.toISOString().slice(0, 10);
      csvData.forEach(row => {
        const rowStr = row.date.toISOString().slice(0, 10);
        if (rowStr === selStr) {
          const country = row.location;
          const val = parseFloat(row[selectedMetric]);
          if (!isNaN(val)) result[country] = val;
        }
      });
    } else {
      // "upto" mode: aggregate all rows with date <= selected date.
      const groups = {};
      csvData.forEach(row => {
        if (row.date <= selDateObj) {
          const country = row.location;
          if (!groups[country]) groups[country] = [];
          groups[country].push(row);
        }
      });
      Object.entries(groups).forEach(([country, rows]) => {
        if (cumulativeMetrics.includes(selectedMetric)) {
          // For cumulative metrics, take the latest available value.
          const latestRow = rows.reduce((a, b) => (a.date > b.date ? a : b));
          const val = parseFloat(latestRow[selectedMetric]);
          if (!isNaN(val)) result[country] = val;
        } else {
          // For daily metrics, sum them up.
          const sum = rows.reduce((acc, row) => {
            const v = parseFloat(row[selectedMetric]);
            return acc + (isNaN(v) ? 0 : v);
          }, 0);
          result[country] = sum;
        }
      });
    }
    return result;
  };

  // --- Draw the heatmap using D3 ---
  useEffect(() => {
    if (!geoData || csvData.length === 0 || !selectedDate) return;

    // Remove any existing SVG.
    d3.select("#map-container").selectAll("*").remove();

    const width = 960;
    const height = 500;

    // Create responsive SVG.
    const svg = d3.select("#map-container")
      .append("svg")
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g");

    // Set up projection and path generator.
    const projection = d3.geoMercator()
      .scale(130)
      .center([0, 20])
      .translate([width / 2, height / 2]);
    const path = d3.geoPath().projection(projection);

    // Compute the metric data for each country.
    const currentMetricData = computeMetricData();

    // Calculate color scale domain.
    const metricValues = Object.values(currentMetricData);
    const minValue = metricValues.length ? Math.min(...metricValues) : 0;
    const maxValue = metricValues.length ? Math.max(...metricValues) : 1;

    const colorScale = d3.scaleSequential()
      .domain([minValue, maxValue])
      .interpolator(d3.interpolateBlues);

    // Draw each country.
    g.selectAll("path")
      .data(geoData.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", d => {
        const countryName = d.properties.name;
        const mappedName = mapCountryName(countryName);
        const value = currentMetricData[mappedName];
        return value !== undefined ? colorScale(value) : "#ccc";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .on("mouseover", function (event, d) {
        d3.select(this)
          .attr("stroke-width", 1.5)
          .attr("stroke", "#333");
        const countryName = d.properties.name;
        const mappedName = mapCountryName(countryName);
        const value = currentMetricData[mappedName];
        const formattedValue = formatValue(value, selectedMetric);
        d3.select("#tooltip")
          .style("opacity", 1)
          .html(`<strong>${countryName}</strong><br/>${formatMetricName(selectedMetric)}: ${formattedValue}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function () {
        d3.select(this)
          .attr("stroke-width", 0.5)
          .attr("stroke", "#fff");
        d3.select("#tooltip").style("opacity", 0);
      });

    // Add a legend.
    const legendWidth = 200;
    const legendHeight = 20;
    const legend = svg.append("g")
      .attr("transform", `translate(${width - legendWidth - 20}, ${height - 50})`);

    // Define gradient for the legend.
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", colorScale(minValue));
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", colorScale(maxValue));

    legend.append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

    // Legend labels.
    legend.append("text")
      .attr("x", 0)
      .attr("y", legendHeight + 15)
      .style("text-anchor", "start")
      .text(formatValue(minValue, selectedMetric));
    legend.append("text")
      .attr("x", legendWidth)
      .attr("y", legendHeight + 15)
      .style("text-anchor", "end")
      .text(formatValue(maxValue, selectedMetric));
    legend.append("text")
      .attr("x", legendWidth / 2)
      .attr("y", -5)
      .style("text-anchor", "middle")
      .style("font-weight", "bold")
      .text(formatMetricName(selectedMetric));

  }, [geoData, csvData, selectedDate, selectedMetric, mode]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Dashboard Header */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-800">COVID‑19 Data Dashboard</h1>
        <p className="mt-2 text-lg text-gray-600">
          Explore COVID‑19 trends by date and metric. Use the slider and controls below to select a metric and a date.
        </p>
      </header>

      {/* Controls */}
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md mb-8">
        {/* Metric Selector */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium">Select Metric</label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="mt-1 p-2 border rounded w-full"
          >
            {metricOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {/* Date Slider */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium">
            Select Date: {selectedDate ? new Date(selectedDate).toLocaleDateString() : ""}
          </label>
          <input
            type="range"
            min={dateRange.min ? dateRange.min.getTime() : 0}
            max={dateRange.max ? dateRange.max.getTime() : 0}
            value={selectedDate || (dateRange.max ? dateRange.max.getTime() : 0)}
            onChange={(e) => setSelectedDate(Number(e.target.value))}
            className="w-full mt-1"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>{dateRange.min ? dateRange.min.toLocaleDateString() : ""}</span>
            <span>{dateRange.max ? dateRange.max.toLocaleDateString() : ""}</span>
          </div>
        </div>
        {/* Display Mode Toggle */}
        <div className="mb-4">
          <label className="block text-gray-700 font-medium">Display Mode</label>
          <div className="mt-2 flex items-center space-x-6">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="mode"
                value="single"
                checked={mode === "single"}
                onChange={() => setMode("single")}
                className="form-radio"
              />
              <span className="ml-2">Show data for single date</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="mode"
                value="upto"
                checked={mode === "upto"}
                onChange={() => setMode("upto")}
                className="form-radio"
              />
              <span className="ml-2">Show data up to selected date</span>
            </label>
          </div>
        </div>
      </div>

      {/* Heatmap Container */}
      <div id="map-container" className="mt-8 border rounded overflow-hidden"></div>
      {/* Tooltip */}
      <div
        id="tooltip"
        className="absolute bg-white p-2 rounded shadow border pointer-events-none opacity-0 transition-opacity"
        style={{ zIndex: 10 }}
      ></div>
    </div>
  );
};

export default CovidDashboard;
