import { NextResponse } from 'next/server';

type XposedExposureItem = {
  data_classes?: string[];
};

type XposedAnalyticsResponse = {
  BreachesSummary?: {
    site?: string;
  };
  ExposedData?: XposedExposureItem[];
};

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Unknown error';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email) return NextResponse.json({ error: 'Missing email parameter' }, { status: 400 });

  try {
    // We will call the breach-analytics endpoint to get deep details on what exactly was leaked.
    const res = await fetch(`https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(email)}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (res.status === 404) {
      return NextResponse.json({ email, breached: false, breaches: [], data_exposed: [] });
    }

    if (!res.ok) throw new Error(`XposedOrNot API HTTP ${res.status}`);

    const data: XposedAnalyticsResponse = await res.json();
    
    // Parse the analytics data
    const breachList: string[] = [];
    const dataExposed = new Set<string>();

    if (data.BreachesSummary && data.BreachesSummary.site) {
       breachList.push(...data.BreachesSummary.site.split(';').filter(Boolean));
    }
    
    if (data.ExposedData && Array.isArray(data.ExposedData)) {
       data.ExposedData.forEach((item) => {
          if (item.data_classes && Array.isArray(item.data_classes)) {
             item.data_classes.forEach((dc: string) => dataExposed.add(dc));
          }
       });
    }

    return NextResponse.json({
      email,
      breached: breachList.length > 0,
      breaches: breachList,
      data_exposed: Array.from(dataExposed).sort()
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Leak lookup failed', detail: getErrorMessage(error) }, { status: 502 });
  }
}
