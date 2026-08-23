"use client";

import { useEffect, useMemo, useState } from "react";

const greetings = {
  morning: ["Good morning", "Morning", "A strong start to the day", "Ready when you are"],
  afternoon: ["Good afternoon", "Afternoon", "A productive afternoon ahead", "Let's keep things moving"],
  evening: ["Good evening", "Evening", "Winding down, but still making progress", "Let's finish strong"],
  late: ["Working late?", "Still here?", "A late one, I see", "Keeping the operation moving after hours"],
};

function periodForHour(hour: number) {
  if (hour >= 5 && hour < 12) return "morning" as const;
  if (hour >= 12 && hour < 18) return "afternoon" as const;
  if (hour >= 18 && hour < 22) return "evening" as const;
  return "late" as const;
}

function pick(list: readonly string[], hour: number) {
  return list[hour % list.length];
}

export function TimeAwareGreeting() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const greeting = useMemo(() => {
    const period = periodForHour(now.getHours());
    return pick(greetings[period], now.getHours());
  }, [now]);

  return <h1>{greeting}.</h1>;
}
