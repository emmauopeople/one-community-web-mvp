import { useEffect, useMemo, useState } from "react";
import {
  getContactChannels,
  getDailyActivity,
  getEventSummary,
  getTopCategories,
  getTopCities,
  getTopContactedSkills,
  getTopViewedSkills,
} from "../../api/analyticsApi";
import { getAdminLoginMonitoring } from "../../api/monitoringApi";
import DashboardLayout from "../../components/layout/DashboardLayout";
const TABS = { BUSINESS: "business", LOGINS: "logins" };
function toNumber(value) {
  return Number(value || 0);
}
function getMaxValue(items, key) {
  return Math.max(...items.map((item) => toNumber(item[key])), 1);
}
function StatCard({ label, value, subtext }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      {" "}
      <p className="text-sm text-gray-500">{label}</p>{" "}
      <h3 className="mt-2 text-2xl font-bold text-gray-800">{value}</h3>{" "}
      {subtext ? (
        <p className="mt-1 text-xs text-gray-500">{subtext}</p>
      ) : null}{" "}
    </div>
  );
}
function BarList({ title, items, labelKey, valueKey, emptyText }) {
  const max = getMaxValue(items, valueKey);
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      {" "}
      <h3 className="mb-4 text-lg font-semibold text-gray-800">{title}</h3>{" "}
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">
          {" "}
          {emptyText || "No data available."}{" "}
        </p>
      ) : (
        <div className="space-y-4">
          {" "}
          {items.map((item) => {
            const value = toNumber(item[valueKey]);
            const width = `${Math.max((value / max) * 100, 4)}%`;
            return (
              <div key={`${item[labelKey]}-${value}`}>
                {" "}
                <div className="mb-1 flex items-center justify-between text-sm">
                  {" "}
                  <span className="max-w-[70%] truncate font-medium text-gray-700">
                    {" "}
                    {item[labelKey] || "Unknown"}{" "}
                  </span>{" "}
                  <span className="text-gray-500">{value}</span>{" "}
                </div>{" "}
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  {" "}
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-green-500"
                    style={{ width }}
                  />{" "}
                </div>{" "}
              </div>
            );
          })}{" "}
        </div>
      )}{" "}
    </div>
  );
}
function ContactChannelChart({ channels }) {
  const total = channels.reduce((sum, item) => sum + toNumber(item.clicks), 0);
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      {" "}
      <h3 className="mb-4 text-lg font-semibold text-gray-800">
        {" "}
        Contact Channels{" "}
      </h3>{" "}
      {total === 0 ? (
        <p className="text-sm text-gray-500">No contact clicks available.</p>
      ) : (
        <div className="space-y-4">
          {" "}
          {channels.map((item) => {
            const clicks = toNumber(item.clicks);
            const percent = total > 0 ? Math.round((clicks / total) * 100) : 0;
            return (
              <div key={item.channel}>
                {" "}
                <div className="mb-1 flex items-center justify-between text-sm">
                  {" "}
                  <span className="font-medium text-gray-700">
                    {item.channel}
                  </span>{" "}
                  <span className="text-gray-500">
                    {" "}
                    {clicks} clicks • {percent}%{" "}
                  </span>{" "}
                </div>{" "}
                <div className="h-4 overflow-hidden rounded-full bg-gray-100">
                  {" "}
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-green-500"
                    style={{ width: `${Math.max(percent, 4)}%` }}
                  />{" "}
                </div>{" "}
              </div>
            );
          })}{" "}
        </div>
      )}{" "}
    </div>
  );
}
function DailyActivityChart({ rows }) {
  const max = Math.max(
    ...rows.map((row) =>
      Math.max(
        toNumber(row.searches),
        toNumber(row.skill_views),
        toNumber(row.contact_clicks),
      ),
    ),
    1,
  );
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      {" "}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {" "}
        <h3 className="text-lg font-semibold text-gray-800">
          Daily Activity
        </h3>{" "}
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          {" "}
          <span>Blue: Searches</span> <span>Green: Skill Views</span>{" "}
          <span>Amber: Contact Clicks</span>{" "}
        </div>{" "}
      </div>{" "}
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No daily activity available.</p>
      ) : (
        <div className="overflow-x-auto">
          {" "}
          <div className="flex min-w-[640px] items-end gap-4 border-b border-gray-200 pb-4">
            {" "}
            {rows.map((row) => {
              const searches = toNumber(row.searches);
              const skillViews = toNumber(row.skill_views);
              const contactClicks = toNumber(row.contact_clicks);
              return (
                <div
                  key={row.day}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  {" "}
                  <div className="flex h-40 items-end gap-1">
                    {" "}
                    <div
                      title={`Searches: ${searches}`}
                      className="w-3 rounded-t bg-blue-600"
                      style={{
                        height: `${Math.max((searches / max) * 100, 4)}%`,
                      }}
                    />{" "}
                    <div
                      title={`Skill Views: ${skillViews}`}
                      className="w-3 rounded-t bg-green-500"
                      style={{
                        height: `${Math.max((skillViews / max) * 100, 4)}%`,
                      }}
                    />{" "}
                    <div
                      title={`Contact Clicks: ${contactClicks}`}
                      className="w-3 rounded-t bg-amber-500"
                      style={{
                        height: `${Math.max((contactClicks / max) * 100, 4)}%`,
                      }}
                    />{" "}
                  </div>{" "}
                  <div className="text-center text-xs text-gray-500">
                    {" "}
                    {new Date(row.day).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                  </div>{" "}
                </div>
              );
            })}{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
}
function SkillTable({ title, rows, valueLabel, valueKey }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      {" "}
      <h3 className="mb-4 text-lg font-semibold text-gray-800">{title}</h3>{" "}
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No skill data available.</p>
      ) : (
        <div className="overflow-x-auto">
          {" "}
          <table className="min-w-full text-sm">
            {" "}
            <thead className="bg-blue-700 text-white">
              {" "}
              <tr className="text-left">
                {" "}
                <th className="py-3 pr-4 pl-3 font-semibold">Skill</th>{" "}
                <th className="py-3 pr-4 font-semibold">City</th>{" "}
                <th className="py-3 pr-4 font-semibold">Category</th>{" "}
                <th className="py-3 pr-4 font-semibold">{valueLabel}</th>{" "}
              </tr>{" "}
            </thead>{" "}
            <tbody>
              {" "}
              {rows.map((row) => (
                <tr
                  key={`${row.skill_id}-${row.title}-${row[valueKey]}`}
                  className="border-b last:border-b-0"
                >
                  {" "}
                  <td className="py-3 pr-4 pl-3 font-medium text-gray-800">
                    {" "}
                    {row.title}{" "}
                  </td>{" "}
                  <td className="py-3 pr-4 text-gray-600">{row.city}</td>{" "}
                  <td className="py-3 pr-4 text-gray-600">{row.category}</td>{" "}
                  <td className="py-3 pr-4 font-semibold text-gray-800">
                    {" "}
                    {row[valueKey]}{" "}
                  </td>{" "}
                </tr>
              ))}{" "}
            </tbody>{" "}
          </table>{" "}
        </div>
      )}{" "}
    </div>
  );
}
export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState(TABS.BUSINESS);
  const [days, setDays] = useState(7);
  const [minutes, setMinutes] = useState(15);
  const [businessLoading, setBusinessLoading] = useState(true);
  const [businessError, setBusinessError] = useState("");
  const [summary, setSummary] = useState({});
  const [topCities, setTopCities] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [contactChannels, setContactChannels] = useState([]);
  const [topViewedSkills, setTopViewedSkills] = useState([]);
  const [topContactedSkills, setTopContactedSkills] = useState([]);
  const [dailyActivity, setDailyActivity] = useState([]);
  const [loginSummary, setLoginSummary] = useState({
    success_count: 0,
    failed_count: 0,
    total_count: 0,
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loginLoading, setLoginLoading] = useState(true);
  const [loginError, setLoginError] = useState("");
  const totalContacts = useMemo(() => {
    return toNumber(summary.contact_clicks);
  }, [summary]);
  useEffect(() => {
    const loadBusinessAnalytics = async () => {
      setBusinessLoading(true);
      setBusinessError("");
      try {
        const [
          summaryData,
          citiesData,
          categoriesData,
          channelsData,
          viewedData,
          contactedData,
          dailyData,
        ] = await Promise.all([
          getEventSummary(days),
          getTopCities(days),
          getTopCategories(days),
          getContactChannels(days),
          getTopViewedSkills(days),
          getTopContactedSkills(days),
          getDailyActivity(days),
        ]);
        setSummary(summaryData.summary || {});
        setTopCities(citiesData.top_cities || []);
        setTopCategories(categoriesData.top_categories || []);
        setContactChannels(channelsData.contact_channels || []);
        setTopViewedSkills(viewedData.top_viewed_skills || []);
        setTopContactedSkills(contactedData.top_contacted_skills || []);
        setDailyActivity(dailyData.daily_activity || []);
      } catch (err) {
        setBusinessError(
          err.response?.data?.message || "Failed to load business analytics",
        );
      } finally {
        setBusinessLoading(false);
      }
    };
    loadBusinessAnalytics();
  }, [days]);
  useEffect(() => {
    const loadLoginMonitoring = async () => {
      setLoginLoading(true);
      setLoginError("");
      try {
        const data = await getAdminLoginMonitoring(minutes);
        setLoginSummary({
          success_count: Number(data.summary?.success_count || 0),
          failed_count: Number(data.summary?.failed_count || 0),
          total_count: Number(data.summary?.total_count || 0),
        });
        setRecentLogs(data.recent_logs || []);
      } catch (err) {
        setLoginError(
          err.response?.data?.message || "Failed to load monitoring data",
        );
      } finally {
        setLoginLoading(false);
      }
    };
    loadLoginMonitoring();
  }, [minutes]);
  return (
    <DashboardLayout title="Analytics">
      {" "}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {" "}
        <div className="flex flex-wrap gap-2">
          {" "}
          <button
            type="button"
            onClick={() => setActiveTab(TABS.BUSINESS)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === TABS.BUSINESS ? "bg-gradient-to-r from-blue-600 to-green-500 text-white" : "bg-white text-gray-700 shadow-sm"}`}
          >
            {" "}
            Business Analytics{" "}
          </button>{" "}
          <button
            type="button"
            onClick={() => setActiveTab(TABS.LOGINS)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === TABS.LOGINS ? "bg-gradient-to-r from-blue-600 to-green-500 text-white" : "bg-white text-gray-700 shadow-sm"}`}
          >
            {" "}
            Login Monitoring{" "}
          </button>{" "}
        </div>{" "}
        {activeTab === TABS.BUSINESS ? (
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {" "}
            <option value={7}>Last 7 days</option>{" "}
            <option value={14}>Last 14 days</option>{" "}
            <option value={30}>Last 30 days</option>{" "}
            <option value={90}>Last 90 days</option>{" "}
          </select>
        ) : (
          <select
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {" "}
            <option value={15}>Last 15 minutes</option>{" "}
            <option value={60}>Last 60 minutes</option>{" "}
            <option value={360}>Last 6 hours</option>{" "}
            <option value={1440}>Last 24 hours</option>{" "}
          </select>
        )}{" "}
      </div>{" "}
      {activeTab === TABS.BUSINESS ? (
        businessLoading ? (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            {" "}
            <p className="text-sm text-gray-500">
              Loading business analytics...
            </p>{" "}
          </div>
        ) : businessError ? (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            {" "}
            <p className="text-sm text-red-600">{businessError}</p>{" "}
          </div>
        ) : (
          <div className="space-y-5">
            {" "}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {" "}
              <StatCard label="Searches" value={summary.searches || 0} />{" "}
              <StatCard label="Skill Views" value={summary.skill_views || 0} />{" "}
              <StatCard label="Contact Clicks" value={totalContacts} />{" "}
              <StatCard
                label="Total Events"
                value={summary.total_events || 0}
              />{" "}
            </div>{" "}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {" "}
              <StatCard
                label="WhatsApp Clicks"
                value={summary.whatsapp_clicks || 0}
              />{" "}
              <StatCard
                label="Email Clicks"
                value={summary.email_clicks || 0}
              />{" "}
              <StatCard
                label="Search → View"
                value={`${summary.search_to_view_rate || 0}%`}
                subtext="Skill views divided by searches"
              />{" "}
              <StatCard
                label="View → Contact"
                value={`${summary.view_to_contact_rate || 0}%`}
                subtext="Contact clicks divided by skill views"
              />{" "}
            </div>{" "}
            <DailyActivityChart rows={dailyActivity} />{" "}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {" "}
              <BarList
                title="Top Searched Cities"
                items={topCities}
                labelKey="city"
                valueKey="searches"
              />{" "}
              <BarList
                title="Top Searched Categories"
                items={topCategories}
                labelKey="category"
                valueKey="searches"
              />{" "}
              <ContactChannelChart channels={contactChannels} />{" "}
            </div>{" "}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {" "}
              <SkillTable
                title="Top Viewed Skills"
                rows={topViewedSkills}
                valueLabel="Views"
                valueKey="views"
              />{" "}
              <SkillTable
                title="Top Contacted Skills"
                rows={topContactedSkills}
                valueLabel="Contacts"
                valueKey="contacts"
              />{" "}
            </div>{" "}
          </div>
        )
      ) : loginLoading ? (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          {" "}
          <p className="text-sm text-gray-500">
            Loading login monitoring...
          </p>{" "}
        </div>
      ) : loginError ? (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          {" "}
          <p className="text-sm text-red-600">{loginError}</p>{" "}
        </div>
      ) : (
        <div className="space-y-4">
          {" "}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {" "}
            <StatCard
              label="Successful Admin Logins"
              value={loginSummary.success_count}
            />{" "}
            <StatCard
              label="Failed Admin Logins"
              value={loginSummary.failed_count}
            />{" "}
            <StatCard
              label="Total Login Attempts"
              value={loginSummary.total_count}
            />{" "}
          </div>{" "}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            {" "}
            <h3 className="mb-4 text-lg font-semibold text-gray-800">
              {" "}
              Recent Admin Login Activity{" "}
            </h3>{" "}
            {recentLogs.length === 0 ? (
              <p className="text-sm text-gray-500">No recent login activity.</p>
            ) : (
              <div className="overflow-x-auto">
                {" "}
                <div className="max-h-[420px] overflow-y-auto rounded-xl border">
                  {" "}
                  <table className="min-w-full text-sm">
                    {" "}
                    <thead className="sticky top-0 z-10 bg-blue-700 text-white">
                      {" "}
                      <tr className="text-left">
                        {" "}
                        <th className="py-3 pr-4 pl-3 font-semibold">
                          Email
                        </th>{" "}
                        <th className="py-3 pr-4 font-semibold">Status</th>{" "}
                        <th className="py-3 pr-4 font-semibold">Reason</th>{" "}
                        <th className="py-3 pr-4 font-semibold">IP</th>{" "}
                        <th className="py-3 pr-4 font-semibold">Time</th>{" "}
                      </tr>{" "}
                    </thead>{" "}
                    <tbody>
                      {" "}
                      {recentLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="border-b last:border-b-0 hover:bg-gray-50"
                        >
                          {" "}
                          <td className="py-4 pr-4 pl-3 text-gray-800">
                            {" "}
                            {log.email_attempted}{" "}
                          </td>{" "}
                          <td className="py-4 pr-4">
                            {" "}
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${log.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                            >
                              {" "}
                              {log.status}{" "}
                            </span>{" "}
                          </td>{" "}
                          <td className="py-4 pr-4 text-gray-600">
                            {" "}
                            {log.failure_reason || "-"}{" "}
                          </td>{" "}
                          <td className="py-4 pr-4 text-gray-600">
                            {" "}
                            {log.ip_address || "-"}{" "}
                          </td>{" "}
                          <td className="py-4 pr-4 text-gray-600">
                            {" "}
                            {new Date(log.created_at).toLocaleString()}{" "}
                          </td>{" "}
                        </tr>
                      ))}{" "}
                    </tbody>{" "}
                  </table>{" "}
                </div>{" "}
              </div>
            )}{" "}
          </div>{" "}
        </div>
      )}{" "}
    </DashboardLayout>
  );
}
