import {createPortal} from 'react-dom';
import {t,getLanguage} from '../../i18n';
import './analytics-print.css';

export default function AnalyticsReport({report}) {
  if (!report) return null;
  const {range,summary:s}=report;
  const number=value=>Number(value||0).toLocaleString(getLanguage());
  const table=(title, columns, rows)=><section key={title} className={rows.length<=10?'report-short-section':''}>
    <h2>{t(title)}</h2>
    {!rows.length ? <p>{t('No data available.')}</p> : <table><thead><tr>{columns.map(([key,label])=><th key={key}>{t(label)}</th>)}</tr></thead>
      <tbody>{rows.map((row,i)=><tr key={i}>{columns.map(([key])=><td key={key}>{typeof row[key]==='number'?number(row[key]):key==='channel'||['Unknown','Unknown Skill'].includes(row[key])?t(row[key]):row[key]}</td>)}</tr>)}</tbody></table>}
  </section>;
  const metrics=[['Searches',s.searches],['Skill Views',s.skill_views],['Contact Clicks',s.contact_clicks],['WhatsApp Clicks',s.whatsapp_clicks],['Email Clicks',s.email_clicks],['Searches without results',s.no_result_searches],['Total Events',s.total_events]];
  return createPortal(<article id="analytics-print-report" lang={getLanguage()}>
    <header><p>ONE COMMUNITY</p><h1>{t('Business Analytics')}</h1>
      <p>{range.start_date} — {range.end_date} · Africa/Douala (UTC+1)</p>
      <p>{t('Generated at')}: {new Date(range.generated_at).toLocaleString(getLanguage(),{timeZone:'Africa/Douala',hour12:false})}</p></header>
    {table('Activity summary',[['label','Metric'],['value','Count']],metrics.map(([label,value])=>({label:t(label),value})))}
    <p>{t('Activity ratios are event counts, not unique visitors or confirmed bookings. They can exceed 100%.')}</p>
    <p>{t('Views per 100 searches')}: {number(s.search_to_view_rate)} · {t('Contacts per 100 views')}: {number(s.view_to_contact_rate)}</p>
    <p>{t('Reports include recorded events only. Today is partial; missed historical events cannot be recovered.')}</p>
    {table('Top Searched Cities',[['city','City'],['searches','Searches']],report.top_cities)}
    {table('Top Searched Categories',[['category','Category'],['searches','Searches']],report.top_categories)}
    {table('Contact Channels',[['channel','Channel'],['clicks','Contact Clicks']],report.contact_channels)}
    {table('Top Viewed Skills',[['title','Skill'],['city','City'],['category','Category'],['views','Views']],report.top_viewed_skills)}
    {table('Top Contacted Skills',[['title','Skill'],['city','City'],['category','Category'],['contacts','Contacts']],report.top_contacted_skills)}
    {table('Daily Activity',[['day','Date'],['searches','Searches'],['skill_views','Skill Views'],['contact_clicks','Contact Clicks']],report.daily_activity)}
  </article>,document.body);
}
