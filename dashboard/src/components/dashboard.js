"use client";

import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Calendar,
  Clock,
  Globe,
  HelpCircle,
  MapPin,
  Maximize2,
  Minimize2,
  Search,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Users,
  WormIcon as Virus,
} from "lucide-react";

// DatePicker Component
const DatePicker = ({ value, min, max, onChange }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Select Date
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Calendar className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={onChange}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );
};

// Circular Progress Component for Vaccination
const CircularProgress = ({
  value,
  color,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = value / 100;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{Math.round(value)}%</span>
        </div>
      </div>
      {label && (
        <div className="mt-2 text-sm font-medium text-gray-700">{label}</div>
      )}
      {sublabel && <div className="text-xs text-gray-500">{sublabel}</div>}
    </div>
  );
};

const CovidDashboard = () => {
  // --- State Variables ---
  const [geoData, setGeoData] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [dateRange, setDateRange] = useState({ min: null, max: null });
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState("total_cases");
  const [showQueries, setShowQueries] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [compareCountry, setCompareCountry] = useState(null);
  const [countryList, setCountryList] = useState([]);
  const [countryData, setCountryData] = useState([]);
  const [compareCountryData, setCompareCountryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState({
    totalCases: 0,
    totalDeaths: 0,
    totalVaccinations: 0,
    recoveryRate: 0,
    fatalityRate: 0,
  });
  const [showStoryInsights, setShowStoryInsights] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showTooltip, setShowTooltip] = useState(false);
  const [gdpData, setGdpData] = useState([]);
  const cardRef = useRef(null);

  // --- Define metric options ---
  const metricOptions = [
    {
      value: "total_cases",
      label: "Total Cases",
      color: "#f87171",
      icon: <Virus className="w-5 h-5" />,
    },
    {
      value: "total_deaths",
      label: "Total Deaths",
      color: "#6b7280",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
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
  ];

  // Dashboard queries that this visualization answers
  const dashboardQueries = [
    "What is the global distribution of COVID-19 cases?",
    "How have cases and deaths evolved over time in specific countries?",
    "What is the vaccination progress across different regions?",
    "How do demographic factors correlate with COVID-19 impact?",
    "Which countries have the highest case fatality rates?",
    "How do different regions compare in their pandemic trajectories?",
    "What are the current global statistics for cases, deaths, and vaccinations?",
    "How has the pandemic affected countries with different population densities?",
    "What is the relationship between vaccination rates and new cases?",
    "How do countries with similar demographics differ in pandemic outcomes?",
  ];

  const cumulativeMetrics = [
    "total_cases",
    "total_deaths",
    "total_vaccinations",
  ];

  // --- Load world map GeoJSON ---
  useEffect(() => {
    setIsLoading(true);
    d3.json(
      "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
    )
      .then((data) => {
        setGeoData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error loading GeoJSON:", err);
        setIsLoading(false);
      });
  }, []);

  // --- Load CSV data from public folder ---
  

  useEffect(() => {
    setIsLoading(true);
    d3.csv("https://golden-khapse-13f5ae.netlify.app/owid-covid-data.csv")
      .then((data) => {
        // Convert date strings into Date objects and numeric fields to numbers.
        data.forEach((d) => {
          d.date = new Date(d.date);
          Object.keys(d).forEach((key) => {
            if (
              key !== "date" &&
              key !== "iso_code" &&
              key !== "continent" &&
              key !== "location"
            ) {
              d[key] = d[key] === "" ? null : +d[key];
            }
          });
        });

        setCsvData(data);

        // Compute the date range excluding dates with no data
        const datesWithData = data
          .filter(
            (d) =>
              d.total_cases != null &&
              d.total_deaths != null &&
              d.total_vaccinations != null &&
              d.new_cases_smoothed != null &&
              d.new_deaths_smoothed != null
          )
          .map((d) => d.date.getTime());

        const [minTime, maxTime] = d3.extent(datesWithData);
        const minDate = new Date(minTime);
        const maxDate = new Date(maxTime);
        setDateRange({ min: minDate, max: maxDate });

        // Set default selected date as the latest available.
        setSelectedDate(maxTime);

        // Extract unique countries.
        const countries = [...new Set(data.map((d) => d.location))].sort();
        setCountryList(countries);
        if (countries.length > 0) {
          setSelectedCountry(
            countries.find((c) => c === "World") || countries[0]
          );
          setCompareCountry(
            countries.find((c) => c !== selectedCountry && c !== "World") ||
              countries[1]
          );
        }

        // Calculate global statistics based on the selected date.
        updateGlobalStats(data, maxTime);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error loading CSV:", err);
        setIsLoading(false);
      });
  }, []);

  // --- Recalculate country-specific data when selected country or csvData changes ---
  useEffect(() => {
    if (selectedCountry && csvData.length > 0) {
      const countrySpecificData = csvData.filter(
        (d) => d.location === selectedCountry
      );
      countrySpecificData.sort((a, b) => a.date - b.date);
      setCountryData(countrySpecificData);

      // Generate GDP data for the economic impact visualization
      generateGdpData(countrySpecificData);
    }
  }, [selectedCountry, csvData]);

  // Generate GDP data for economic impact visualization
  const generateGdpData = (countryData) => {
    if (!countryData || countryData.length === 0) return;

    // Filter data to quarterly points (for simplicity)
    const quarterlyData = [];
    let lastQuarter = -1;

    countryData.forEach((d) => {
      const quarter = Math.floor(d.date.getMonth() / 3);
      if (quarter !== lastQuarter && d.gdp_per_capita) {
        quarterlyData.push({
          date: d.date,
          gdp: d.gdp_per_capita,
          // Add a baseline and calculate percentage change from baseline
          baseline: countryData[0].gdp_per_capita || 0,
          percentChange: d.gdp_per_capita
            ? ((d.gdp_per_capita - (countryData[0].gdp_per_capita || 0)) /
                (countryData[0].gdp_per_capita || 1)) *
              100
            : 0,
        });
        lastQuarter = quarter;
      }
    });

    setGdpData(quarterlyData);
  };

  // --- Recalculate compare country data when compareCountry or csvData changes ---
  useEffect(() => {
    if (compareCountry && csvData.length > 0) {
      const countrySpecificData = csvData.filter(
        (d) => d.location === compareCountry
      );
      countrySpecificData.sort((a, b) => a.date - b.date);
      setCompareCountryData(countrySpecificData);
    }
  }, [compareCountry, csvData]);

  // --- Recalculate global stats when selectedDate or csvData change ---
  useEffect(() => {
    if (csvData.length > 0 && selectedDate) {
      updateGlobalStats(csvData, selectedDate);
    }
  }, [csvData, selectedDate]);

  // --- Helper: Update global statistics based on selected date ---
  const updateGlobalStats = (data, dateTimestamp) => {
    const selDateObj = new Date(dateTimestamp);
    const selStr = selDateObj.toISOString().slice(0, 10);
    const filtered = data.filter(
      (d) => d.date.toISOString().slice(0, 10) <= selStr
    );

    // Group by country to get the latest data for each country up to the selected date
    const countryGroups = {};
    filtered.forEach((d) => {
      const country = d.location;
      if (!countryGroups[country] || d.date > countryGroups[country].date) {
        countryGroups[country] = d;
      }
    });

    const worldData = countryGroups["World"];
    if (worldData) {
      setGlobalStats({
        totalCases: worldData.total_cases || 0,
        totalDeaths: worldData.total_deaths || 0,
        totalVaccinations: worldData.total_vaccinations || 0,
        recoveryRate:
          worldData.total_cases && worldData.total_deaths
            ? ((worldData.total_cases - worldData.total_deaths) /
                worldData.total_cases) *
              100
            : 0,
        fatalityRate:
          worldData.total_cases && worldData.total_deaths
            ? (worldData.total_deaths / worldData.total_cases) * 100
            : 0,
      });
    } else {
      // Aggregate across countries if no "World" row.
      const totalCases = Object.values(countryGroups)
        .filter((d) => d.location !== "World")
        .reduce((sum, d) => sum + (d.total_cases || 0), 0);

      const totalDeaths = Object.values(countryGroups)
        .filter((d) => d.location !== "World")
        .reduce((sum, d) => sum + (d.total_deaths || 0), 0);

      const totalVaccinations = Object.values(countryGroups)
        .filter((d) => d.location !== "World")
        .reduce((sum, d) => sum + (d.total_vaccinations || 0), 0);

      setGlobalStats({
        totalCases,
        totalDeaths,
        totalVaccinations,
        recoveryRate: totalCases
          ? ((totalCases - totalDeaths) / totalCases) * 100
          : 0,
        fatalityRate: totalCases ? (totalDeaths / totalCases) * 100 : 0,
      });
    }
  };

  // --- Helper: Map country names between GeoJSON and CSV ---
  const mapCountryName = (name) => {
    const mapping = {
      USA: "United States",
      England: "United Kingdom",
      "South Korea": "Korea, Rep.",
      "North Korea": "Korea, Dem. People's Rep.",
      "Democratic Republic of the Congo": "Congo",
      "United Republic of Tanzania": "Tanzania",
      "Republic of Congo": "Congo",
      "Republic of Serbia": "Serbia",
      "Czech Republic": "Czechia",
    };
    return mapping[name] || name;
  };

  // --- Helper: Return a human-friendly metric label ---
  const getMetricLabel = (metric) => {
    const found = metricOptions.find((opt) => opt.value === metric);
    return found ? found.label : metric;
  };

  // --- Helper: Get metric color and icon ---
  const getMetricColor = (metric) => {
    const found = metricOptions.find((opt) => opt.value === metric);
    return found ? found.color : "#6b7280";
  };

  // --- Helper: Format a numeric value for display ---
  const formatValue = (value, precision = 1) => {
    if (value === undefined || value === null || isNaN(value)) return "No data";
    if (value > 1e9) return (value / 1e9).toFixed(precision) + "B";
    if (value > 1e6) return (value / 1e6).toFixed(precision) + "M";
    if (value > 1e3) return (value / 1e3).toFixed(precision) + "K";
    return Number.parseFloat(value).toFixed(precision);
  };

  // --- Helper: Format a percentage ---
  const formatPercent = (value, precision = 2) => {
    if (value === undefined || value === null || isNaN(value)) return "No data";
    return Number.parseFloat(value).toFixed(precision) + "%";
  };

  // --- Compute metric data per country based on the selected date  ---
  const computeMetricData = () => {
    const result = {};
    if (csvData.length === 0 || !selectedDate) return result;

    const selDateObj = new Date(selectedDate);

    // Group data by country
    const countryGroups = {};
    csvData.forEach((row) => {
      if (row.date <= selDateObj) {
        const country = row.location;
        if (!countryGroups[country]) {
          countryGroups[country] = [];
        }
        countryGroups[country].push(row);
      }
    });

    // For each country, get the latest data point before or on the selected date
    Object.entries(countryGroups).forEach(([country, rows]) => {
      if (rows.length === 0) return;

      // Sort by date descending
      rows.sort((a, b) => b.date - a.date);

      // Find the latest row where the selected metric is > 0 and not null
      const validRow = rows.find((row) => {
        const val = row[selectedMetric];
        return val !== null && !isNaN(val) && val > 0;
      });

      if (!validRow) return;

      const val = validRow[selectedMetric];
      result[country] = val;
    });

    return result;
  };

  // --- Compute a global KPI (aggregate across countries) ---
  const computeGlobalKPI = (dataMap) => {
    let total = 0;
    Object.values(dataMap).forEach((val) => {
      if (typeof val === "number" && !isNaN(val)) total += val;
    });
    return total;
  };

  // --- Prepare data for time series charts (all data) ---
  const prepareFullTimeSeriesData = (countryData, metric) => {
    if (!countryData.length) return [];
    const filtered = countryData.filter((d) => d[metric] !== null);
    if (!filtered.length) return [];
    const sorted = filtered.sort((a, b) => a.date - b.date);
    return sorted.map((d) => ({
      date: d.date.toISOString().slice(0, 10),
      value: d[metric] || 0,
    }));
  };

  // --- Prepare comparison data for two countries ---
  const prepareComparisonData = (country1Data, country2Data, metric) => {
    if (!country1Data.length || !country2Data.length) return [];
    const allDates = new Set([
      ...country1Data.map((d) => d.date.toISOString().slice(0, 10)),
      ...country2Data.map((d) => d.date.toISOString().slice(0, 10)),
    ]);
    const sortedDates = Array.from(allDates).sort();
    const country1Map = {};
    const country2Map = {};
    country1Data.forEach((d) => {
      country1Map[d.date.toISOString().slice(0, 10)] = d[metric] || 0;
    });
    country2Data.forEach((d) => {
      country2Map[d.date.toISOString().slice(0, 10)] = d[metric] || 0;
    });
    return sortedDates.map((date) => ({
      date,
      [selectedCountry]: country1Map[date] || 0,
      [compareCountry]: country2Map[date] || 0,
    }));
  };

  // --- Get the latest value for a metric up to the selected date ---
  const getLatestMetricValue = (metric) => {
    if (!selectedDate || csvData.length === 0) return 0;
    const selDateObj = new Date(selectedDate);
    const worldData = csvData
      .filter((d) => d.location === "World" && d.date <= selDateObj)
      .sort((a, b) => b.date - a.date);
    if (worldData.length > 0) {
      return worldData[0][metric] || 0;
    }
    return 0;
  };

  // --- Helper: Get the latest country data up to the selected date ---
  const getLatestCountryData = (country) => {
    const filtered = csvData
      .filter(
        (d) =>
          d.location === country && new Date(d.date) <= new Date(selectedDate)
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // sort latest first

    if (!filtered.length) return {};

    const latestData = {};
    const keys = Object.keys(filtered[0]);

    for (const key of keys) {
      for (const row of filtered) {
        const value = row[key];
        if (
          value !== null &&
          value !== 0 &&
          value !== "" &&
          key !== "location" &&
          key !== "date"
        ) {
          latestData[key] = value;
          break; // stop at the first (latest) valid value for this key
        }
      }
    }

    // Retain location and date info from the latest row
    latestData.location = country;
    latestData.date = filtered[0].date;

    return latestData;
  };

  // --- Generate insights based on the data ---
  const generateInsights = () => {
    if (!selectedDate || !selectedCountry || countryData.length === 0)
      return [];
    const insights = [];
    const filteredData = countryData.filter(
      (d) => d.date <= new Date(selectedDate)
    );
    if (filteredData.length === 0) return [];
    filteredData.sort((a, b) => b.date - a.date);
    const latestData = filteredData[0];
    const recentData = countryData.slice(-30);
    const caseTrend =
      recentData.length > 10
        ? recentData
            .slice(-5)
            .reduce((sum, d) => sum + (d.new_cases_smoothed || 0), 0) /
            5 -
          recentData
            .slice(-10, -5)
            .reduce((sum, d) => sum + (d.new_cases_smoothed || 0), 0) /
            5
        : 0;
    const deathTrend =
      recentData.length > 10
        ? recentData
            .slice(-5)
            .reduce((sum, d) => sum + (d.new_deaths_smoothed || 0), 0) /
            5 -
          recentData
            .slice(-10, -5)
            .reduce((sum, d) => sum + (d.new_deaths_smoothed || 0), 0) /
            5
        : 0;

    if (selectedCountry === "World") {
      insights.push({
        title: "Global Pandemic Status",
        text: `As of ${new Date(
          selectedDate
        ).toLocaleDateString()}, the world has recorded ${formatValue(
          globalStats.totalCases
        )} COVID‑19 cases and ${formatValue(globalStats.totalDeaths)} deaths.`,
        icon: <Globe className="w-5 h-5 text-blue-500" />,
      });
    } else {
      insights.push({
        title: `${selectedCountry} Overview`,
        text: `${selectedCountry} has recorded ${formatValue(
          latestData?.total_cases
        )} cases and ${formatValue(
          latestData?.total_deaths
        )} deaths as of ${new Date(latestData.date).toLocaleDateString()}.`,
        icon: <MapPin className="w-5 h-5 text-indigo-500" />,
      });
    }

    if (caseTrend > 0) {
      insights.push({
        title: "Rising Cases",
        text: `${selectedCountry} is experiencing an upward trend in new cases, with a ${formatValue(
          caseTrend,
          0
        )} average daily increase compared to the previous period.`,
        icon: <TrendingUp className="w-5 h-5 text-red-500" />,
      });
    } else if (caseTrend < 0) {
      insights.push({
        title: "Declining Cases",
        text: `${selectedCountry} is showing a downward trend in new cases, with a ${formatValue(
          Math.abs(caseTrend),
          0
        )} average daily decrease compared to the previous period.`,
        icon: <TrendingDown className="w-5 h-5 text-green-500" />,
      });
    }

    if (latestData?.people_fully_vaccinated_per_hundred > 0) {
      insights.push({
        title: "Vaccination Progress",
        text: `${formatPercent(
          latestData?.people_fully_vaccinated_per_hundred
        )} of the population in ${selectedCountry} is fully vaccinated against COVID-19.`,
        icon: <Thermometer className="w-5 h-5 text-green-500" />,
      });
    }

    return insights;
  };

  // --- Prepare vaccination data for stacked bar chart ---
  const prepareVaccinationData = (countryData) => {
    if (!countryData || countryData.length === 0) return [];

    // Filter data to get the latest vaccination data
    const filteredData = countryData.filter(
      (d) => d.date <= new Date(selectedDate)
    );

    if (filteredData.length === 0) return [];

    // Sort by date (latest first)
    filteredData.sort((a, b) => b.date - a.date);

    // Get the latest data point with vaccination information
    const latestData = filteredData.find(
      (d) =>
        d.people_vaccinated_per_hundred !== null ||
        d.people_fully_vaccinated_per_hundred !== null
    );

    if (!latestData) return [];

    // Calculate first dose only percentage
    const firstDoseOnly =
      (latestData.people_vaccinated_per_hundred || 0) -
      (latestData.people_fully_vaccinated_per_hundred || 0);

    return [
      {
        name: "Vaccination Status",
        "First Dose Only": firstDoseOnly > 0 ? firstDoseOnly : 0,
        "Fully Vaccinated": latestData.people_fully_vaccinated_per_hundred || 0,
        Unvaccinated: 100 - (latestData.people_vaccinated_per_hundred || 0),
      },
    ];
  };

  // --- Prepare data for Cases and Deaths Breakdown chart ---
  const prepareCasesDeathsData = (countryData) => {
    if (!countryData || countryData.length === 0) return [];

    // Filter data to get the latest data
    const filteredData = countryData.filter(
      (d) => d.date <= new Date(selectedDate)
    );

    if (filteredData.length === 0) return [];

    // Sort by date (latest first)
    filteredData.sort((a, b) => b.date - a.date);

    // Get the latest data point
    const latestData = filteredData[0];

    if (!latestData) return [];

    return [
      {
        name: "Cases",
        value: latestData.total_cases || 0,
        fill: "#f87171", // red-400
      },
      {
        name: "Deaths",
        value: latestData.total_deaths || 0,
        fill: "#6b7280", // gray-500
      },
    ];
  };

  const metricData = computeMetricData();
  const insights = generateInsights();

  // --- Draw the heatmap using D3 ---
  useEffect(() => {
    if (
      !geoData ||
      csvData.length === 0 ||
      !selectedDate ||
      activeTab !== "overview"
    )
      return;

    const metricData = computeMetricData();
    d3.select("#map-container").selectAll("*").remove();

    const container = document.getElementById("map-container");
    if (!container) return;

    const width = container.clientWidth;
    const height = 500;

    const svg = d3
      .select("#map-container")
      .append("svg")
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    const g = svg.append("g");

    const projection = d3
      .geoMercator()
      .scale(width / 6.5)
      .center([0, 20])
      .translate([width / 2, height / 2]);
    const path = d3.geoPath().projection(projection);

    const values = Object.values(metricData).filter(
      (v) => v !== null && !isNaN(v)
    );
    const minValue = values.length ? d3.min(values) : 0;
    const maxValue = values.length ? d3.max(values) : 1;

    const colorScale = d3
      .scaleSequential()
      .domain([minValue, maxValue])
      .interpolator(d3.interpolateReds);

    const zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    g.selectAll("path")
      .data(geoData.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", (d) => {
        const countryName = d.properties.name;
        const mappedName = mapCountryName(countryName);
        const val = metricData[mappedName];
        return val !== undefined && val !== null && !isNaN(val)
          ? colorScale(val)
          : "#e5e7eb";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .attr("class", "country-path")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("stroke-width", 1.5).attr("stroke", "#333");
        const countryName = d.properties.name;
        const mappedName = mapCountryName(countryName);
        const val = metricData[mappedName];
        const precision = val > 1e6 ? 3 : 2;
        d3.select("#tooltip")
          .style("opacity", 1)
          .html(
            `
            <div class="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
              <h3 class="font-bold text-gray-800">${countryName}</h3>
              <div class="flex items-center mt-1 text-gray-700">
                <span>${getMetricLabel(selectedMetric)}:</span>
                <span class="ml-2 font-semibold">${formatValue(
                  val,
                  precision
                )}</span>
              </div>
            </div>
          `
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke-width", 0.5).attr("stroke", "#fff");
        d3.select("#tooltip").style("opacity", 0);
      })
      .on("click", (event, d) => {
        const countryName = d.properties.name;
        const mappedName = mapCountryName(countryName);
        if (countryList.includes(mappedName)) {
          setSelectedCountry(mappedName);
          setActiveTab("country");
        }
      });

    const legendWidth = 200;
    const legendHeight = 20;
    const legend = svg
      .append("g")
      .attr(
        "transform",
        `translate(${width - legendWidth - 20}, ${height - 50})`
      );
    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0")
      .attr("y1", "0")
      .attr("x2", "100%")
      .attr("y2", "0");
    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", colorScale(minValue));
    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", colorScale(maxValue));
    legend
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)")
      .style("stroke", "#ccc")
      .style("stroke-width", 0.5);
    legend
      .append("text")
      .attr("x", 0)
      .attr("y", legendHeight + 15)
      .style("text-anchor", "start")
      .style("font-size", "12px")
      .text(formatValue(minValue));
    legend
      .append("text")
      .attr("x", legendWidth)
      .attr("y", legendHeight + 15)
      .style("text-anchor", "end")
      .style("font-size", "12px")
      .text(formatValue(maxValue));
    legend
      .append("text")
      .attr("x", legendWidth / 2)
      .attr("y", -5)
      .style("text-anchor", "middle")
      .style("font-weight", "bold")
      .style("font-size", "12px")
      .text(getMetricLabel(selectedMetric));

    const zoomControls = svg
      .append("g")
      .attr("transform", `translate(20, ${height - 60})`);
    zoomControls
      .append("rect")
      .attr("width", 30)
      .attr("height", 30)
      .attr("rx", 4)
      .attr("fill", "white")
      .attr("stroke", "#ccc")
      .attr("cursor", "pointer")
      .on("click", () => {
        svg.transition().duration(500).call(zoom.scaleBy, 1.5);
      });
    zoomControls
      .append("text")
      .attr("x", 15)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("fill", "#333")
      .attr("pointer-events", "none")
      .text("+");
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
        svg.transition().duration(500).call(zoom.scaleBy, 0.75);
      });
    zoomControls
      .append("text")
      .attr("x", 15)
      .attr("y", 55)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("fill", "#333")
      .attr("pointer-events", "none")
      .text("−");
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
        svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
      });
    zoomControls
      .append("text")
      .attr("x", 15)
      .attr("y", 90)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#333")
      .attr("pointer-events", "none")
      .text("Reset");
  }, [geoData, csvData, selectedDate, selectedMetric, countryList, activeTab]);

  // Format date for input field
  const formatDateForInput = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  };

  // --- Render the Overview Tab content ---
  const renderOverviewTab = () => {
    return (
      <>
        <div className="bg-white rounded-lg shadow-md p-5 border-l-4 border-red-500 hover:shadow-lg transition-shadow mb-8">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 flex items-center">
                <Virus className="w-4 h-4 mr-1 text-red-500" />
                Total Cases (Cumulative)
              </p>
              <h3 className="mt-1 text-2xl font-bold text-gray-900">
                {formatValue(getLatestMetricValue("total_cases"))}
              </h3>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <span>As of {new Date(selectedDate).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Global total from beginning of pandemic to selected date
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              Global COVID‑19 Distribution
            </h2>
            <div className="flex items-center text-sm text-gray-500 mt-4">
              <MapPin className="w-4 h-4 mr-1" />
              <span>Click on a country to view detailed data</span>
            </div>
          </div>
          <div
            id="map-container"
            className="h-[500px] w-full relative border-t border-gray-200"
          ></div>
          <div
            id="tooltip"
            className="absolute bg-white p-2 rounded shadow border pointer-events-none opacity-0 transition-opacity"
            style={{ zIndex: 10 }}
          ></div>
        </div>
      </>
    );
  };

  const renderCustomizedXAxisTick = ({ x, y, payload }) => {
    // Set colors: for example, green for Cases and red for Deaths.
    const color =
      payload.value === "Cases"
        ? "#4caf50"
        : payload.value === "Deaths"
        ? "#f44336"
        : "#000";
    return (
      <text x={x} y={y + 10} textAnchor="middle" fill={color}>
        {payload.value}
      </text>
    );
  };

  // --- Render the Country Analysis Tab content ---
  const renderCountryTab = () => {
    // Use getLatestCountryData to filter out future records for the selected country.
    const latestData = getLatestCountryData(selectedCountry);
    const vaccinationData = prepareVaccinationData(countryData);
    const casesDeathsData = prepareCasesDeathsData(countryData);

    return (
      <>
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Region-Specific Analysis
          </h2>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Region
            </label>
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

          {selectedCountry &&
            latestData &&
            Object.keys(latestData).length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                    <p className="text-sm text-gray-500 flex items-center">
                      <Virus className="w-4 h-4 mr-1 text-red-500" />
                      Total Cases
                    </p>
                    <h3 className="font-semibold text-xl">
                      {formatValue(latestData.total_cases)}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatValue(latestData.total_cases_per_million)} per
                      million
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                    <p className="text-sm text-gray-500 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-1 text-gray-700" />
                      Total Deaths
                    </p>
                    <h3 className="font-semibold text-xl">
                      {formatValue(latestData.total_deaths)}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatValue(latestData.total_deaths_per_million)} per
                      million
                    </p>
                  </div>
                  <div className="relative">
                    <div
                      ref={cardRef}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                    >
                      <p className="text-sm text-gray-500 flex items-center">
                        <Thermometer className="w-4 h-4 mr-1 text-green-500" />
                        Vaccinations
                      </p>
                      <h3 className="font-semibold text-xl">
                        {formatValue(latestData.total_vaccinations)}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatValue(latestData.people_vaccinated_per_hundred)}%
                        of population
                      </p>
                    </div>

                    {showTooltip && (
                      <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm bg-black text-white rounded-md shadow-lg max-w-xs">
                        <p>
                          Total vaccinations can be more than the population of
                          the country as one person can receive multiple
                          vaccinations too.
                        </p>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-black"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vaccination Progress Visualization */}
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow mb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                    <Thermometer className="w-5 h-5 mr-2 text-green-500" />
                    Vaccination Progress
                  </h3>
                  <div className="flex flex-col md:flex-row items-center justify-around">
                    <CircularProgress
                      value={latestData.people_vaccinated_per_hundred || 0}
                      color="#60a5fa"
                      label="At Least One Dose"
                      sublabel={`${formatValue(
                        latestData.people_vaccinated || 0
                      )} people`}
                    />
                    <CircularProgress
                      value={
                        latestData.people_fully_vaccinated_per_hundred || 0
                      }
                      color="#34d399"
                      label="Fully Vaccinated"
                      sublabel={`${formatValue(
                        latestData.people_fully_vaccinated || 0
                      )} people`}
                    />
                    <CircularProgress
                      value={latestData.total_boosters_per_hundred || 0}
                      color="#a78bfa"
                      label="Booster Doses"
                      sublabel={`${formatValue(
                        latestData.total_boosters || 0
                      )} doses`}
                    />
                  </div>
                </div>

                {/* Stacked Bar Chart for Vaccination Percentages */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow mb-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                      <Thermometer className="w-5 h-5 mr-2 text-green-500" />
                      Vaccination Coverage Breakdown
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={vaccinationData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis
                            label={{
                              value: "Percentage of Population",
                              angle: -90,
                              position: "insideLeft",
                            }}
                          />
                          <RechartsTooltip
                            formatter={(value) => [`${value.toFixed(2)}%`]}
                          />
                          <Legend />
                          <Bar
                            dataKey="Fully Vaccinated"
                            stackId="a"
                            fill="#34d399"
                            barSize={50}
                          />
                          <Bar
                            dataKey="First Dose Only"
                            stackId="a"
                            fill="#60a5fa"
                          />
                          <Bar
                            dataKey="Unvaccinated"
                            stackId="a"
                            fill="#c0c2c4"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow mb-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-red-500" />
                      Cases and Deaths Breakdown
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={casesDeathsData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: "#333", fontSize: 12 }}
                            axisLine={{ stroke: "#333" }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: "#333", fontSize: 12 }}
                            axisLine={{ stroke: "#333" }}
                            tickLine={false}
                            label={{
                              value: "Count",
                              angle: -90,
                              position: "insideLeft",
                              fill: "#333",
                              fontSize: 14,
                              fontWeight: "bold",
                            }}
                            tickFormatter={(tick) => formatValue(tick)}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: "#f5f5f5",
                              border: "none",
                            }}
                            labelStyle={{ color: "#333", fontWeight: "bold" }}
                            formatter={(value) => [formatValue(value), ""]}
                          />

                          {/* Remove default legend (no `name` on the <Bar>) and add a custom legend */}
                          <Legend
                            content={() => (
                              <div
                                style={{ textAlign: "center", marginTop: 10 }}
                              >
                                <span style={{ marginRight: 20 }}>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      width: 12,
                                      height: 12,
                                      backgroundColor: "#f87171",
                                      marginRight: 5,
                                    }}
                                  />
                                  Cases
                                </span>
                                <span>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      width: 12,
                                      height: 12,
                                      backgroundColor: "#6b7280",
                                      marginRight: 5,
                                    }}
                                  />
                                  Deaths
                                </span>
                              </div>
                            )}
                          />

                          {/* One <Bar> that draws both bars (Cases & Deaths) via two data points */}
                          <Bar dataKey="value" barSize={50}>
                            {casesDeathsData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow mb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-blue-500" />
                    {getMetricLabel(selectedMetric)} - Full Timeline
                  </h3>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={prepareFullTimeSeriesData(
                          countryData.filter(
                            (d) => d.date <= new Date(selectedDate)
                          ),
                          selectedMetric
                        )}
                        margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                      >
                        <defs>
                          <linearGradient
                            id="colorValue"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={getMetricColor(selectedMetric)}
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor={getMetricColor(selectedMetric)}
                              stopOpacity={0.1}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return date.toLocaleDateString("en-US", {
                              month: "short",
                              year: "numeric",
                            });
                          }}
                          interval={Math.ceil(
                            prepareFullTimeSeriesData(
                              countryData.filter(
                                (d) => d.date <= new Date(selectedDate)
                              ),
                              selectedMetric
                            ).length / 12
                          )}
                        />
                        <YAxis
                          tickFormatter={(value) => formatValue(value)}
                          tick={{ fontSize: 10 }}
                          domain={[0, (dataMax) => dataMax * 1.05]}
                        />
                        <RechartsTooltip
                          formatter={(value) => {
                            const precision = value > 1e6 ? 3 : 2;
                            return [
                              formatValue(value, precision),
                              getMetricLabel(selectedMetric),
                            ];
                          }}
                          labelFormatter={(label) =>
                            `Date: ${new Date(label).toLocaleDateString()}`
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={getMetricColor(selectedMetric)}
                          fillOpacity={1}
                          fill="url(#colorValue)"
                          animationDuration={1000}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="mt-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-indigo-600" />
                    Country Demographics & Risk Factors
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <p className="text-sm text-gray-500">Population</p>
                      <p className="font-semibold text-gray-900">
                        {formatValue(latestData.population)}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <p className="text-sm text-gray-500">
                        Population Density
                      </p>
                      <p className="font-semibold text-gray-900">
                        {formatValue(latestData.population_density)} per km²
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <p className="text-sm text-gray-500">Median Age</p>
                      <p className="font-semibold text-gray-900">
                        {formatValue(latestData.median_age)} years
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <p className="text-sm text-gray-500">GDP per Capita</p>
                      <p className="font-semibold text-gray-900">
                        ${formatValue(latestData.gdp_per_capita)}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <p className="text-sm text-gray-500">Aged 65+</p>
                      <p className="font-semibold text-gray-900">
                        {formatValue(latestData.aged_65_older)}%
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <p className="text-sm text-gray-500">
                        Diabetes Prevalence
                      </p>
                      <p className="font-semibold text-gray-900">
                        {formatValue(latestData.diabetes_prevalence)}%
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <p className="text-sm text-gray-500">Hospital Beds</p>
                      <p className="font-semibold text-gray-900">
                        {formatValue(latestData.hospital_beds_per_thousand)} per
                        1,000
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <p className="text-sm text-gray-500">Life Expectancy</p>
                      <p className="font-semibold text-gray-900">
                        {formatValue(latestData.life_expectancy)} years
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
        </div>
      </>
    );
  };

  // --- Render the Trends & Patterns Tab content ---
  const renderTrendsTab = () => {
    return (
      <>
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Compare Regions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Region
              </label>
              <select
                value={selectedCountry || ""}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {countryList.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Second Region
              </label>
              <select
                value={compareCountry || ""}
                onChange={(e) => setCompareCountry(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {countryList.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedCountry &&
            compareCountry &&
            countryData.length > 0 &&
            compareCountryData.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-blue-500" />
                  {getMetricLabel(selectedMetric)} Comparison
                </h3>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={prepareComparisonData(
                        countryData.filter(
                          (d) => d.date <= new Date(selectedDate)
                        ),
                        compareCountryData.filter(
                          (d) => d.date <= new Date(selectedDate)
                        ),
                        selectedMetric
                      )}
                      margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          });
                        }}
                        interval={Math.ceil(
                          prepareComparisonData(
                            countryData.filter(
                              (d) => d.date <= new Date(selectedDate)
                            ),
                            compareCountryData.filter(
                              (d) => d.date <= new Date(selectedDate)
                            ),
                            selectedMetric
                          ).length / 12
                        )}
                      />
                      <YAxis
                        tickFormatter={(value) => formatValue(value)}
                        tick={{ fontSize: 10 }}
                        domain={[0, (dataMax) => dataMax * 1.05]}
                      />
                      <RechartsTooltip
                        formatter={(value, name) => {
                          const precision = value > 1e6 ? 3 : 2;
                          return [formatValue(value, precision), name];
                        }}
                        labelFormatter={(label) =>
                          `Date: ${new Date(label).toLocaleDateString()}`
                        }
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey={selectedCountry}
                        stroke="#f87171"
                        dot={false}
                        activeDot={false}
                        animationDuration={1000}
                      />
                      <Line
                        type="monotone"
                        dataKey={compareCountry}
                        stroke="#60a5fa"
                        dot={false}
                        activeDot={false}
                        animationDuration={1000}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Dashboard Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm py-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Virus className="w-8 h-8 mr-3 text-red-500" />
                COVID‑19 Global Dashboard
              </h1>
              <p className="mt-1 text-gray-600">
                Visualizing the pandemic's global impact and telling the data
                story
              </p>
            </div>
            <button
              onClick={() => setShowQueries(!showQueries)}
              className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              {showQueries ? (
                <>
                  <Minimize2 className="w-4 h-4 mr-1" />
                  Hide Queries
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 mr-1" />
                  Show Queries
                </>
              )}
            </button>
          </div>
          {showQueries && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 text-blue-800 animate-fadeIn">
              <h2 className="text-lg font-semibold mb-2 flex items-center">
                <HelpCircle className="w-5 h-5 mr-2" />
                Questions This Dashboard Answers
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                {dashboardQueries.map((query, index) => (
                  <li key={index}>{query}</li>
                ))}
              </ul>
            </div>
          )}
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
            {/* Data Controls - Always visible */}
            <div className="bg-white rounded-lg shadow-md mb-8">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <Globe className="w-5 h-5 mr-2" />
                  COVID-19 Data Controls
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Metric
                    </label>
                    <select
                      value={selectedMetric}
                      onChange={(e) => setSelectedMetric(e.target.value)}
                      className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      {metricOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="">
                    <DatePicker
                      value={formatDateForInput(selectedDate)}
                      min={formatDateForInput(dateRange.min)}
                      max={formatDateForInput(dateRange.max)}
                      onChange={(e) => {
                        const date = new Date(e.target.value);
                        if (!isNaN(date.getTime())) {
                          setSelectedDate(date.getTime());
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                    <Clock className="w-5 h-5 text-blue-500 mr-2" />
                    <div>
                      <span className="block text-xs font-medium text-gray-500">
                        Current View
                      </span>
                      <span className="text-lg font-semibold text-gray-900">
                        {selectedDate
                          ? new Date(selectedDate).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Story Insights Panel */}
            {showStoryInsights && insights.length > 0 && (
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg shadow-md p-6 mb-8 border border-blue-100 animate-fadeIn">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-indigo-900 flex items-center">
                    <HelpCircle className="w-5 h-5 mr-2 text-indigo-600" />
                    Data Story Insights
                  </h2>
                  <button
                    onClick={() => setShowStoryInsights(false)}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {insights.map((insight, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg p-4 shadow-sm border border-indigo-100"
                    >
                      <div className="flex items-center mb-2">
                        {insight.icon}
                        <h3 className="font-semibold text-indigo-800 ml-2">
                          {insight.title}
                        </h3>
                      </div>
                      <p className="text-gray-700 text-sm">{insight.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`flex-1 py-4 px-6 text-center font-medium ${
                    activeTab === "overview"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Global Overview
                </button>
                <button
                  onClick={() => setActiveTab("country")}
                  className={`flex-1 py-4 px-6 text-center font-medium ${
                    activeTab === "country"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Region Analysis
                </button>
                <button
                  onClick={() => setActiveTab("trends")}
                  className={`flex-1 py-4 px-6 text-center font-medium ${
                    activeTab === "trends"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Trends & Patterns
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && renderOverviewTab()}
            {activeTab === "country" && renderCountryTab()}
            {activeTab === "trends" && renderTrendsTab()}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm text-gray-500">
                Data source: Our World in Data COVID‑19 dataset
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Last updated:{" "}
                {dateRange.max ? dateRange.max.toLocaleDateString() : ""}
              </p>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-400 text-center">
            <p>
              This dashboard is made by Suryaansh Rathinam - A0307215N for
              Assignment 2 of NUS CS5346 Information Visualisation Course
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CovidDashboard;
