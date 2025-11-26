// ********************
// Last names: Campo, Hallare, Lobo, Rebollos
// Language: Kotlin
// Paradigm(s): Functional Programming, Object-Oriented Programming
// ********************
import java.io.File
import java.nio.file.Files
import java.nio.file.Paths
import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.*
import kotlin.math.abs
import kotlin.math.round

fun main() {
    val inputFile = "dpwh_flood_control_projects.csv"
    var parsed: List<ProjectRow>? = null

    while (true) {
        println()
        println("Select Language Implementation:")
        println("[1] Load the file")
        println("[2] Generate Reports")
        println("[3] Exit")
        print("\nEnter choice: ")

        when (readLine()?.trim()) {
            "1" -> parsed = loadDataset(inputFile)
            "2" -> {
                if (parsed == null) {
                    println("Please load the file first (option 1).")
                    continue
                }
                println("\nGenerating reports...")
                generateReports(parsed)
                println("Outputs saved to individual files…")
            }
            "3" -> {
                println("Exiting program...")
                return
            }
            else -> println("Invalid choice. Try again.")
        }
    }
}

// --------------------------------------------------------------------
// LOAD DATASET
// --------------------------------------------------------------------
fun loadDataset(inputFile: String): List<ProjectRow>? {
    if (!Files.exists(Paths.get(inputFile))) {
        println("Input file '$inputFile' not found in working directory.")
        return null
    }

    val lines = File(inputFile).readLines()
    if (lines.isEmpty()) {
        println("CSV is empty.")
        return null
    }

    println("Processing dataset...")

    val header = parseCsvLine(lines.first())
    val headerIndex = header.mapIndexed { idx, name -> name.trim().lowercase() to idx }.toMap()

    val dateFormats = listOf(
        DateTimeFormatter.ofPattern("yyyy-MM-dd"),
        DateTimeFormatter.ofPattern("M/d/yyyy"),
        DateTimeFormatter.ofPattern("d/M/yyyy"),
        DateTimeFormatter.ofPattern("yyyy/MM/dd")
    )

    val parsed = mutableListOf<ProjectRow>()
    var loaded = 0

    for (i in 1 until lines.size) {
        val row = lines[i]
        if (row.isBlank()) continue
        loaded++
        val fields = parseCsvLine(row)
        val get = { name: String -> headerIndex[name.lowercase()]?.let { idx -> fields.getOrNull(idx)?.trim() } }

        try {
            val approved = get("approvedbudgetforcontract")?.toDoubleOrNullSafe()
            val contractCost = get("contractcost")?.toDoubleOrNullSafe()
            val startDate = parseDateWithFormats(get("startdate"), dateFormats)
            val actualCompletion = parseDateWithFormats(get("actualcompletiondate"), dateFormats)
            val fundingYear = get("fundingyear")?.toIntOrNull() ?: startDate?.year
            val region = get("region") ?: "Unknown"
            val mainIsland = get("mainisland") ?: "Unknown"
            val contractor = get("contractor") ?: "Unknown"
            val typeOfWork = get("typeofwork") ?: "Unknown"
            val province = get("province") ?: "Unknown"

            if (approved == null || contractCost == null || startDate == null || actualCompletion == null || fundingYear == null)
                continue
            if (fundingYear !in 2021..2023) continue

            val costSavings = approved - contractCost
            val delay = ChronoUnit.DAYS.between(startDate, actualCompletion).toInt()

            parsed.add(
                ProjectRow(
                    approved, contractCost, startDate, actualCompletion,
                    region, mainIsland, fundingYear, contractor, typeOfWork, province,
                    costSavings, delay
                )
            )
        } catch (_: Exception) {
            continue
        }
    }

    println("Processing dataset... ($loaded rows loaded, ${parsed.size} filtered for 2021–2023)")
    return parsed
}

// --------------------------------------------------------------------
// GENERATE ALL REPORTS
// --------------------------------------------------------------------
fun generateReports(parsed: List<ProjectRow>) {
    generateReport1(parsed)
    generateReport2(parsed)
    generateReport3(parsed)
    generateSummary(parsed)
}

// --------------------------------------------------------------------
// REPORT 1 - Regional Flood Mitigation Efficiency Summary
// --------------------------------------------------------------------
fun generateReport1(parsed: List<ProjectRow>) {
    val nf = NumberFormat.getNumberInstance(Locale.US).apply {
        minimumFractionDigits = 2; maximumFractionDigits = 2
    }

    val groups = parsed.groupBy { Pair(it.region.trim(), it.mainIsland.trim()) }

    data class R1Row(
        val region: String, val main: String,
        val totalApproved: Double, val medianSavings: Double,
        val avgDelay: Double, val pctDelayOver30: Double,
        val efficiencyScore: Double
    )

    val rows = groups.map { (key, data) ->
        val totalApproved = data.sumOf { it.approvedBudget }
        val medianSavings = median(data.map { it.costSavings })
        val avgDelay = data.map { it.completionDelayDays.toDouble() }.average()
        val pctDelayOver30 = data.count { it.completionDelayDays > 30 }.toDouble() / data.size * 100.0
        val efficiencyScore = if (avgDelay > 0) ((medianSavings / avgDelay) * 100).coerceIn(0.0, 100.0) else 100.0
        R1Row(key.first, key.second, totalApproved, medianSavings, avgDelay, pctDelayOver30, efficiencyScore)
    }.sortedWith(compareByDescending<R1Row> { it.efficiencyScore }.thenBy { it.region })

    val csv = buildString {
        appendLine("Region,MainIsland,TotalApprovedBudget,MedianCostSavings,AvgCompletionDelayDays,PctDelayOver30,EfficiencyScore")
        for (r in rows) {
            appendCsvField(r.region); append(",")
            appendCsvField(r.main); append(",")
            appendCsvField(nf.format(r.totalApproved)); append(",")
            appendCsvField(nf.format(r.medianSavings)); append(",")
            appendCsvField(nf.format(r.avgDelay)); append(",")
            appendCsvField(nf.format(r.pctDelayOver30)); append(",")
            appendCsvField(nf.format(roundTo2(r.efficiencyScore))); appendLine()
        }
    }
    File("report1_regional_efficiency.csv").writeText(csv)
}

// --------------------------------------------------------------------
// REPORT 2 - Top Contractors Performance Ranking
// --------------------------------------------------------------------
fun generateReport2(parsed: List<ProjectRow>) {
    val nf = NumberFormat.getNumberInstance(Locale.US).apply {
        minimumFractionDigits = 2; maximumFractionDigits = 2
    }

    val groups = parsed.groupBy { it.contractor.trim().ifEmpty { "Unknown Contractor" } }

    data class R2Row(
        val contractor: String, val numProjects: Int, val avgDelay: Double,
        val totalSavings: Double, val totalCost: Double,
        val reliability: Double, val riskFlag: String
    )

    val rows = groups.map { (name, data) ->
        val totalCost = data.sumOf { it.contractCost }
        val totalSavings = data.sumOf { it.costSavings }
        val avgDelay = data.map { it.completionDelayDays.toDouble() }.average()
        val reliabilityRaw = ((1.0 - (avgDelay / 90.0)).coerceAtLeast(0.0)) *
                (if (totalCost == 0.0) 0.0 else (totalSavings / totalCost)) * 100.0
        val reliability = roundTo2(reliabilityRaw.coerceIn(0.0, 100.0))
        val riskFlag = if (reliability < 50.0) "High Risk" else "OK"

        R2Row(name, data.size, avgDelay, totalSavings, totalCost, reliability, riskFlag)
    }.filter { it.numProjects >= 5 }
        .sortedByDescending { it.totalCost }
        .take(15)

    val csv = buildString {
        appendLine("Rank,Contractor,TotalCost,NumProjects,AvgDelay,TotalSavings,ReliabilityIndex,RiskFlag")
        for ((index, r) in rows.withIndex()) {
            appendCsvField((index + 1).toString()); append(",")
            appendCsvField(r.contractor); append(",")
            appendCsvField(nf.format(r.totalCost)); append(",")
            appendCsvField(r.numProjects.toString()); append(",")
            appendCsvField(nf.format(r.avgDelay)); append(",")
            appendCsvField(nf.format(r.totalSavings)); append(",")
            appendCsvField(nf.format(r.reliability)); append(",")
            appendCsvField(r.riskFlag); appendLine()
        }
    }
    File("report2_top_contractors.csv").writeText(csv)
}

// --------------------------------------------------------------------
// REPORT 3 - Annual Project Type Cost Overrun Trends
// --------------------------------------------------------------------
fun generateReport3(parsed: List<ProjectRow>) {
    val nf = NumberFormat.getNumberInstance(Locale.US).apply {
        minimumFractionDigits = 2; maximumFractionDigits = 2
    }

    val groups = parsed.groupBy { Pair(it.fundingYear, it.typeOfWork) }
    val rows = groups.map { (key, data) ->
        val year = key.first
        val type = key.second
        val total = data.size
        val avgSavings = data.map { it.costSavings }.average()
        val overrunRate = data.count { it.costSavings < 0 }.toDouble() / total * 100.0
        R3Row(year, type, total, avgSavings, overrunRate, 0.0)
    }.toMutableList()

    val baseline = rows.filter { it.year == 2021 }.associateBy({ it.typeOfWork }, { it.avgSavings })
    for (r in rows) {
        val base = baseline[r.typeOfWork]
        r.yoyPct = if (base == null) 0.0 else if (base == 0.0) 0.0 else ((r.avgSavings - base) / abs(base)) * 100.0
    }

    rows.sortWith(compareBy<R3Row> { it.year }.thenByDescending { it.avgSavings })

    val csv = buildString {
        appendLine("FundingYear,TypeOfWork,TotalProjects,AvgCostSavings,OverrunRatePct,YoYPctChangeFrom2021Baseline")
        for (r in rows) {
            appendCsvField(r.year.toString()); append(",")
            appendCsvField(r.typeOfWork); append(",")
            appendCsvField(r.totalProjects.toString()); append(",")
            appendCsvField(nf.format(r.avgSavings)); append(",")
            appendCsvField(nf.format(r.overrunRate)); append(",")
            appendCsvField(nf.format(roundTo2(r.yoyPct))); appendLine()
        }
    }
    File("report3_annual_type_trends.csv").writeText(csv)
}

// --------------------------------------------------------------------
// SUMMARY JSON
// --------------------------------------------------------------------
fun generateSummary(parsed: List<ProjectRow>) {
    val totalProjects = parsed.size
    val totalContractors = parsed.map { it.contractor }.toSet().size
    val totalProvinces = parsed.map { it.province }.toSet().size
    val globalAvgDelay = parsed.map { it.completionDelayDays.toDouble() }.average()
    val totalSavings = parsed.sumOf { it.costSavings }

    val summary = mapOf(
        "total_projects" to totalProjects,
        "total_contractors" to totalContractors,
        "total_provinces" to totalProvinces,
        "global_average_delay_days" to roundTo2(globalAvgDelay),
        "total_savings_php" to roundTo2(totalSavings)
    )
    File("summary.json").writeText(mapToJson(summary))
}

// --------------------------------------------------------------------
// DATA CLASSES
// --------------------------------------------------------------------
data class ProjectRow(
    val approvedBudget: Double,
    val contractCost: Double,
    val startDate: LocalDate,
    val actualCompletionDate: LocalDate,
    val region: String,
    val mainIsland: String,
    val fundingYear: Int,
    val contractor: String,
    val typeOfWork: String,
    val province: String,
    val costSavings: Double,
    val completionDelayDays: Int
)

data class R3Row(
    val year: Int,
    val typeOfWork: String,
    val totalProjects: Int,
    val avgSavings: Double,
    val overrunRate: Double,
    var yoyPct: Double
)

// --------------------------------------------------------------------
// UTILITIES
// --------------------------------------------------------------------
fun parseCsvLine(line: String): List<String> {
    val result = mutableListOf<String>()
    val current = StringBuilder()
    var inQuotes = false
    var i = 0
    while (i < line.length) {
        val c = line[i]
        when {
            c == '"' -> {
                if (inQuotes && i + 1 < line.length && line[i + 1] == '"') {
                    current.append('"'); i++
                } else inQuotes = !inQuotes
            }
            c == ',' && !inQuotes -> {
                result.add(current.toString())
                current.setLength(0)
            }
            else -> current.append(c)
        }
        i++
    }
    result.add(current.toString())
    return result
}

fun parseDateWithFormats(s: String?, formats: List<DateTimeFormatter>): LocalDate? {
    if (s == null) return null
    val str = s.trim().removeSurrounding("\"").trim()
    if (str.isEmpty()) return null
    try { return LocalDate.parse(str) } catch (_: Exception) {}
    for (fmt in formats) try { return LocalDate.parse(str, fmt) } catch (_: Exception) {}
    val match = Regex("(\\d{4})").find(str)
    return match?.groupValues?.get(1)?.toIntOrNull()?.let { LocalDate.of(it, 1, 1) }
}

fun String?.toDoubleOrNullSafe(): Double? {
    if (this == null) return null
    val cleaned = this.trim()
        .replace("\"", "")
        .replace("Php", "", true)
        .replace("PHP", "", true)
        .replace(",", "")
        .replace(" ", "")
    return cleaned.toDoubleOrNull()
}

fun median(values: List<Double>): Double {
    if (values.isEmpty()) return 0.0
    val sorted = values.sorted()
    val mid = sorted.size / 2
    return if (sorted.size % 2 == 0) (sorted[mid - 1] + sorted[mid]) / 2.0 else sorted[mid]
}

fun roundTo2(v: Double) = round(v * 100.0) / 100.0

fun StringBuilder.appendCsvField(raw: String) {
    val needsQuote = raw.contains(",") || raw.contains("\"") || raw.contains("\n")
    if (!needsQuote) append(raw)
    else append("\"").append(raw.replace("\"", "\"\"")).append("\"")
}

fun mapToJson(map: Map<String, Any>): String {
    val sb = StringBuilder("{\n")
    val entries = map.entries.toList()
    for ((i, e) in entries.withIndex()) {
        sb.append("  \"${e.key}\": ")
        when (val v = e.value) {
            is Number -> sb.append(v)
            is String -> sb.append("\"${v.replace("\"", "\\\"")}\"")
            else -> sb.append("\"$v\"")
        }
        if (i < entries.size - 1) sb.append(",")
        sb.append("\n")
    }
    sb.append("}")
    return sb.toString()
}
