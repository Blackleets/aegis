/**
 * ═══════════════════════════════════════════════════════════════
 *  WORLDWATCH — Intelligence Engine
 *  Gemini integration with zero-cost local fallback analysis
 *  Designed to correlate multi-domain feeds into actionable briefings
 * ═══════════════════════════════════════════════════════════════
 */

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

export interface EarthquakeEvent {
  id: string;
  magnitude: number;
  location: string;
  latitude: number;
  longitude: number;
  depth: number;
  timestamp: string;
  tsunami: boolean;
  felt: number | null;
  alert: string | null;
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  published: string;
  source: string;
  risk_score: number;
  coords: [number, number] | null;
  machine_assessment: string | null;
}

export interface ThreatEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'LOW';
  region: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  source: string;
}

export interface CyberAlert {
  id: string;
  name: string;
  vendor: string;
  product: string;
  severity: string;
  date: string;
  due: string;
  source: string;
}

export interface IntelligenceContext {
  earthquakes: EarthquakeEvent[];
  news: NewsItem[];
  threats: ThreatEvent[];
  cyberAlerts: CyberAlert[];
  timestamp: string;
}

export interface LocalFusionDossier {
  bluf: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'LOW';
  confidence: 'HIGH' | 'MODERATE' | 'LOW';
  hotspots: string[];
  priorityActions: string[];
  watchlist: string[];
}

const SYSTEM_PROMPT = `You are the WorldWatch Intelligence Analyst — a senior intelligence analyst embedded inside the WorldWatch global monitoring platform.

## ROLE
- Correlate seismic, OSINT, cyber, and threat feeds.
- Produce concise, actionable assessments.
- Distinguish correlation from causation.
- State confidence clearly.
- Never fabricate facts not present in context.

## OUTPUT STYLE
- Use concise markdown sections.
- Lead with the most important finding.
- For complex outputs include BLUF, ASSESSMENT CONFIDENCE, and RECOMMENDED ACTIONS.
- Sound like an operator-grade analyst, not a generic chatbot.`;

const BRIEFING_PROMPT = `Generate a WorldWatch daily intelligence briefing.

## WORLDWATCH INTELLIGENCE BRIEFING
**Classification:** OPEN SOURCE INTELLIGENCE (OSINT)
**DTG:** [Current timestamp]

### I. EXECUTIVE SUMMARY
### II. PRIORITY DEVELOPMENTS
### III. HAZARD & SEISMIC PICTURE
### IV. GEOPOLITICAL / INCIDENT PICTURE
### V. CYBER RISK PICTURE
### VI. COMPOUND RISK SCENARIOS
### VII. NEXT 24H / 72H WATCHLIST
### VIII. ASSESSMENT CONFIDENCE

Be specific and reference only the provided data.`;

export function createGeminiClient(apiKey: string): GoogleGenerativeAI {
  return new GoogleGenerativeAI(apiKey);
}

let _keyIndex = 0;

export function rotateApiKey(keys: string[]): string {
  if (keys.length === 0) {
    throw new Error('No API keys available');
  }
  const key = keys[_keyIndex % keys.length];
  _keyIndex = (_keyIndex + 1) % keys.length;
  return key;
}

function serializeContext(context: IntelligenceContext): string {
  const sections: string[] = [];
  sections.push(`[TIMESTAMP] ${context.timestamp}`);

  if (context.earthquakes.length > 0) {
    sections.push(`\n[SEISMIC DATA — ${context.earthquakes.length} events]`);
    for (const eq of context.earthquakes.slice(0, 20)) {
      const tsunamiFlag = eq.tsunami ? ' ⚠️TSUNAMI' : '';
      const alertFlag = eq.alert ? ` [ALERT:${eq.alert.toUpperCase()}]` : '';
      sections.push(
        `  M${eq.magnitude} | ${eq.location} | ${eq.latitude.toFixed(2)},${eq.longitude.toFixed(2)} | Depth:${eq.depth}km | ${eq.timestamp}${tsunamiFlag}${alertFlag}`
      );
    }
  }

  if (context.news.length > 0) {
    sections.push(`\n[OSINT NEWS FEED — ${context.news.length} items]`);
    for (const item of context.news.slice(0, 15)) {
      const coords = item.coords ? ` | GEO:${item.coords[0].toFixed(2)},${item.coords[1].toFixed(2)}` : '';
      sections.push(`  RISK:${item.risk_score}/10 | ${item.source} | ${item.title}${coords} | ${item.published}`);
    }
  }

  if (context.threats.length > 0) {
    sections.push(`\n[THREAT EVENTS — ${context.threats.length} active]`);
    for (const threat of context.threats.slice(0, 15)) {
      sections.push(`  ${threat.severity} | ${threat.type} | ${threat.title} | ${threat.region} | ${threat.timestamp}`);
    }
  }

  if (context.cyberAlerts.length > 0) {
    sections.push(`\n[CYBER ALERTS — ${context.cyberAlerts.length} active]`);
    for (const alert of context.cyberAlerts.slice(0, 10)) {
      sections.push(`  ${alert.id} | ${alert.severity} | ${alert.vendor}/${alert.product} | ${alert.name} | Due:${alert.due}`);
    }
  }

  return sections.join('\n');
}

function severityScore(level: string): number {
  if (level === 'CRITICAL') return 4;
  if (level === 'HIGH') return 3;
  if (level === 'ELEVATED') return 2;
  return 1;
}

function pickTopEarthquake(context: IntelligenceContext): EarthquakeEvent | null {
  if (context.earthquakes.length === 0) return null;
  return [...context.earthquakes].sort((a, b) => {
    const aScore = a.magnitude + (a.tsunami ? 2 : 0) + (a.alert ? 1 : 0);
    const bScore = b.magnitude + (b.tsunami ? 2 : 0) + (b.alert ? 1 : 0);
    return bScore - aScore;
  })[0] ?? null;
}

function pickTopThreat(context: IntelligenceContext): ThreatEvent | null {
  if (context.threats.length === 0) return null;
  return [...context.threats].sort((a, b) => severityScore(b.severity) - severityScore(a.severity))[0] ?? null;
}

function pickTopNews(context: IntelligenceContext): NewsItem | null {
  if (context.news.length === 0) return null;
  return [...context.news].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))[0] ?? null;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

function deriveRiskLevel(context: IntelligenceContext): LocalFusionDossier['riskLevel'] {
  const topEq = pickTopEarthquake(context);
  const topThreat = pickTopThreat(context);
  const topNews = pickTopNews(context);

  if ((topEq && (topEq.magnitude >= 7.5 || topEq.tsunami || !!topEq.alert)) || (topThreat && topThreat.severity === 'CRITICAL')) {
    return 'CRITICAL';
  }
  if ((topEq && topEq.magnitude >= 6.5) || (topThreat && topThreat.severity === 'HIGH') || (topNews && topNews.risk_score >= 8)) {
    return 'HIGH';
  }
  if (context.earthquakes.length > 0 || context.threats.length > 0 || context.news.length > 0) {
    return 'ELEVATED';
  }
  return 'LOW';
}

function deriveConfidence(context: IntelligenceContext): LocalFusionDossier['confidence'] {
  const sources = [
    context.earthquakes.length > 0,
    context.news.length > 0,
    context.threats.length > 0,
    context.cyberAlerts.length > 0,
  ].filter(Boolean).length;

  if (sources >= 3) return 'HIGH';
  if (sources >= 2) return 'MODERATE';
  return 'LOW';
}

export function generateLocalAnalysis(context: IntelligenceContext, userQuery: string): string {
  const riskLevel = deriveRiskLevel(context);
  const confidence = deriveConfidence(context);
  const topEq = pickTopEarthquake(context);
  const topThreat = pickTopThreat(context);
  const topNews = pickTopNews(context);

  const lines: string[] = [];
  lines.push('# WORLDWATCH LOCAL ASSESSMENT');
  lines.push('## BLUF');
  if (topThreat) {
    lines.push(`Highest current pressure comes from **${topThreat.severity} ${topThreat.type}** activity around **${topThreat.region}**, led by *${topThreat.title}*.`);
  } else if (topEq) {
    lines.push(`The dominant live signal is seismic: **M${topEq.magnitude.toFixed(1)}** near **${topEq.location}**${topEq.tsunami ? ' with tsunami relevance' : ''}.`);
  } else if (topNews) {
    lines.push(`The strongest available signal is a high-risk OSINT development from **${topNews.source}**: *${topNews.title}*.`);
  } else {
    lines.push('Live telemetry is sparse right now, so the platform is operating in low-confidence monitoring mode.');
  }

  lines.push('');
  lines.push('## QUERY INTERPRETATION');
  lines.push(`Operator ask: *${userQuery}*`);
  lines.push('');
  lines.push('## LIVE SIGNAL SNAPSHOT');
  lines.push(`- Earthquakes tracked: ${context.earthquakes.length}`);
  lines.push(`- News items in context: ${context.news.length}`);
  lines.push(`- Threat events in context: ${context.threats.length}`);
  lines.push(`- Cyber alerts in context: ${context.cyberAlerts.length}`);

  if (topEq) {
    lines.push(`- Top seismic event: M${topEq.magnitude.toFixed(1)} at ${topEq.location} (${topEq.depth} km depth)`);
  }
  if (topThreat) {
    lines.push(`- Top threat event: ${topThreat.severity} ${topThreat.type} in ${topThreat.region}`);
  }
  if (topNews) {
    lines.push(`- Top OSINT development: ${topNews.title} [risk ${topNews.risk_score}/10]`);
  }

  lines.push('');
  lines.push('## OPERATOR TAKE');
  if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
    lines.push('- Maintain priority watch on the top event cluster and validate whether adjacent feeds begin to converge on the same region or system.');
    lines.push('- Use the RECON and dossier panels to verify whether this is isolated activity or part of a broader escalation pattern.');
  } else if (riskLevel === 'ELEVATED') {
    lines.push('- There is enough signal to justify active monitoring, but not enough evidence yet for a strong escalation conclusion.');
    lines.push('- Focus on whether the same geography, infrastructure theme, or actor set appears across multiple feeds in the next cycle.');
  } else {
    lines.push('- No dominant cross-domain risk cluster is visible yet. Use this period to baseline routine activity and watch for sudden convergence.');
  }

  lines.push('');
  lines.push('## ASSESSMENT CONFIDENCE');
  lines.push(`**${confidence}**`);
  lines.push('');
  lines.push('## MODE');
  lines.push('WorldWatch Local Analyst (zero-cost fallback — no external model spend required).');
  return lines.join('\n');
}

export function generateLocalBriefing(context: IntelligenceContext): string {
  const riskLevel = deriveRiskLevel(context);
  const confidence = deriveConfidence(context);
  const topEq = pickTopEarthquake(context);
  const topThreat = pickTopThreat(context);
  const topNews = pickTopNews(context);

  const priorities = uniqueStrings([
    topThreat ? `${topThreat.severity} ${topThreat.type} pressure in ${topThreat.region}` : '',
    topEq ? `Seismic watch: M${topEq.magnitude.toFixed(1)} near ${topEq.location}` : '',
    topNews ? `High-risk reporting from ${topNews.source}` : '',
    context.cyberAlerts.length > 0 ? `${context.cyberAlerts.length} cyber alerts require triage` : '',
  ]).slice(0, 5);

  return [
    '# WORLDWATCH INTELLIGENCE BRIEFING',
    `**DTG:** ${context.timestamp}`,
    '',
    '## I. EXECUTIVE SUMMARY',
    topThreat
      ? `WorldWatch is tracking a ${topThreat.severity.toLowerCase()} threat-led operating picture centered on ${topThreat.region}.`
      : topEq
        ? `WorldWatch is tracking a seismic-led operating picture centered on ${topEq.location}.`
        : topNews
          ? `WorldWatch is tracking a news-led risk picture with the strongest signal coming from ${topNews.source}.`
          : 'WorldWatch is in broad monitoring posture with limited high-confidence escalation signals at this time.',
    '',
    '## II. PRIORITY DEVELOPMENTS',
    ...(priorities.length > 0 ? priorities.map((item) => `- ${item}`) : ['- No priority developments identified from current telemetry.']),
    '',
    '## III. HAZARD & SEISMIC PICTURE',
    topEq ? `- Highest significance event: M${topEq.magnitude.toFixed(1)} at ${topEq.location}, depth ${topEq.depth} km.` : '- No significant seismic cluster in current context.',
    '',
    '## IV. GEOPOLITICAL / INCIDENT PICTURE',
    topNews ? `- Lead reporting item: ${topNews.title}` : '- No dominant geopolitical incident signal in current context.',
    '',
    '## V. CYBER RISK PICTURE',
    context.cyberAlerts.length > 0 ? `- ${context.cyberAlerts.length} cyber alert(s) present in current context.` : '- No cyber alerts loaded in current context.',
    '',
    '## VI. COMPOUND RISK SCENARIOS',
    riskLevel === 'CRITICAL' || riskLevel === 'HIGH'
      ? '- Cross-domain escalation is plausible if the leading signal begins to converge with adjacent regions, cyber disruptions, or infrastructure stress.'
      : '- Compound risk remains a watch condition rather than a confirmed escalation pattern.',
    '',
    '## VII. NEXT 24H / 72H WATCHLIST',
    '- Watch for repeated geography, repeated actors, or repeated infrastructure categories across feeds.',
    '- Monitor whether the top signal sustains or decays in the next refresh cycle.',
    '',
    '## VIII. ASSESSMENT CONFIDENCE',
    `**${confidence}**`,
    '',
    '_Generated by WorldWatch Local Analyst (zero-cost mode)._'
  ].join('\n');
}

export function generateLocalFusionDossier(context: IntelligenceContext): LocalFusionDossier {
  const riskLevel = deriveRiskLevel(context);
  const confidence = deriveConfidence(context);
  const topEq = pickTopEarthquake(context);
  const topThreat = pickTopThreat(context);
  const topNews = pickTopNews(context);

  const hotspots = uniqueStrings([
    topThreat?.region || '',
    topEq?.location || '',
    topNews?.source || '',
  ]).slice(0, 4);

  const priorityActions = uniqueStrings([
    topThreat ? `Validate whether ${topThreat.region} is appearing across additional feeds before the next cycle.` : '',
    topEq ? `Maintain watch on ${topEq.location} for aftershocks or related infrastructure disruption.` : '',
    topNews ? `Cross-check ${topNews.source} reporting against recon and regional dossier outputs.` : '',
    context.cyberAlerts.length > 0 ? 'Triage cyber alerts for infrastructure overlap with live geographic hotspots.' : '',
  ]).slice(0, 4);

  const watchlist = uniqueStrings([
    topThreat ? `${topThreat.type} recurrence in ${topThreat.region}` : '',
    topEq ? `Aftershock or tsunami-related updates near ${topEq.location}` : '',
    topNews ? `Follow-on reporting tied to ${topNews.title}` : '',
  ]).slice(0, 4);

  const bluf = topThreat
    ? `WorldWatch assesses the current operating picture as ${riskLevel.toLowerCase()}, driven primarily by ${topThreat.severity.toLowerCase()} threat activity centered on ${topThreat.region}.`
    : topEq
      ? `WorldWatch assesses the current operating picture as ${riskLevel.toLowerCase()}, driven primarily by seismic activity near ${topEq.location}.`
      : topNews
        ? `WorldWatch assesses the current operating picture as ${riskLevel.toLowerCase()}, with the strongest live signal coming from high-risk reporting via ${topNews.source}.`
        : 'WorldWatch assesses the current operating picture as low-risk with limited high-confidence escalation indicators in current telemetry.';

  return {
    bluf,
    riskLevel,
    confidence,
    hotspots,
    priorityActions,
    watchlist,
  };
}

export async function analyzeIntelligence(
  client: GoogleGenerativeAI,
  context: IntelligenceContext,
  userQuery: string
): Promise<string> {
  const model: GenerativeModel = client.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT,
  });

  const contextData = serializeContext(context);
  const prompt = `## CURRENT OPERATIONAL DATA
${contextData}

## ANALYST QUERY
${userQuery}

Provide your intelligence assessment based on the operational data above and the analyst query.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateBriefing(
  client: GoogleGenerativeAI,
  context: IntelligenceContext
): Promise<string> {
  const model: GenerativeModel = client.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT,
  });

  const contextData = serializeContext(context);
  const prompt = `${BRIEFING_PROMPT}

## CURRENT OPERATIONAL DATA
${contextData}

Generate the briefing now.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
