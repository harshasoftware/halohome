import Foundation

// MARK: - Cached DateFormatters

private let timeFormatter: DateFormatter = {
    let f = DateFormatter()
    f.dateFormat = "h:mm a"
    return f
}()

private let weekdayFormatter: DateFormatter = {
    let f = DateFormatter()
    f.dateFormat = "EEEE"
    return f
}()

private let monthDayFormatter: DateFormatter = {
    let f = DateFormatter()
    f.dateFormat = "MMM d"
    return f
}()

private let fullDateFormatter: DateFormatter = {
    let f = DateFormatter()
    f.dateFormat = "MMM d, yyyy"
    return f
}()

/// Formats a date relative to the current time
/// - Parameter date: The date to format
/// - Returns: A human-readable relative date string
public func formatDate(_ date: Date) -> String {
    let calendar = Calendar.current
    let now = Date()

    // If within last minute
    if now.timeIntervalSince(date) < 60 {
        return "Just now"
    }

    // If today
    if calendar.isDateInToday(date) {
        return timeFormatter.string(from: date)
    }

    // If yesterday
    if calendar.isDateInYesterday(date) {
        return "Yesterday"
    }

    // If within this week
    if calendar.isDate(date, equalTo: now, toGranularity: .weekOfYear) {
        return weekdayFormatter.string(from: date)
    }

    // If within this year
    if calendar.isDate(date, equalTo: now, toGranularity: .year) {
        return monthDayFormatter.string(from: date)
    }

    // Otherwise show full date
    return fullDateFormatter.string(from: date)
}

