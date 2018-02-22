import React, { Component } from "react";
import getMonth from "date-fns/get_month";
import startOfMonth from "date-fns/start_of_month";
import endOfMonth from "date-fns/end_of_month";
import getDay from "date-fns/get_day";
import addMonths from "date-fns/add_months";
import subMonths from "date-fns/sub_months";
import subDays from "date-fns/sub_days";
import addDays from "date-fns/add_days";
import differenceInDays from "date-fns/difference_in_days";

import format from "date-fns/format";
import de from "date-fns/locale/de";

const Prev = ({ onClick }) => (
  <div className="control-button prev" onClick={onClick}>
    <svg
      fill="#000000"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M15.41 16.09l-4.58-4.59 4.58-4.59L14 5.5l-6 6 6 6z" />
      <path d="M0-.5h24v24H0z" fill="none" />
    </svg>
  </div>
);

const Next = ({ onClick }) => (
  <div className="control-button next" onClick={onClick}>
    <svg
      fill="#000000"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z" />
      <path d="M0-.25h24v24H0z" fill="none" />
    </svg>
  </div>
);

const setupDataStructure = date => {
  const { startDay, endDay } = getDates(date);
  const arr = [];
  let rows = 5;
  let days = 34;
  const delta = differenceInDays(endDay, startDay);
  if (delta > 40) {
    rows = 6;
    days = 41;
  }
  for (let n = 0; n < rows; n = n + 1) {
    arr.push({
      days: [],
      meta: {
        slots: []
      }
    });
  }
  for (let i = 0; i <= days; i++) {
    const day = addDays(startDay, i);
    const week = Math.ceil((i + 1) / 7) - 1;
    arr[week].days.push({
      day,
      events: [],
      formatted: getFormatted(day)
    });
  }
  return arr;
};

const mapEventsToStructure = (arr, events) => {
  for (let row of arr) {
    for (let rowEntry of row.days) {
      const currentDay = new Date(rowEntry.day);
      const nextDay = addDays(currentDay, 1);
      // debugger;
      for (let entry of events) {
        const eventStart = new Date(entry.start);

        const eventEnd = new Date(entry.end);
        if (eventStart >= currentDay && eventEnd <= nextDay) {
          rowEntry.events.push(entry);
        } else if (
          eventStart >= currentDay &&
          eventEnd.setHours(0, 0, 0, 0) <= nextDay &&
          entry.type === "day"
        ) {
          rowEntry.events.push(entry);
        } else if (
          eventStart < nextDay &&
          entry.type === "multiday" &&
          eventEnd > currentDay
        ) {
          if (!row.meta.slots.includes(entry.id)) {
            row.meta.slots.push(entry.id);
          }
          rowEntry.events.push(entry);
        }
      }
    }
  }
  return arr;
};

const getDates = date => {
  const month = getMonth(date);
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  let startDayMonth = getDay(start) - 1;
  if (startDayMonth === -1) startDayMonth = 6;
  let endDayMonth = getDay(end) - 1;
  if (endDayMonth === -1) endDayMonth = 6;
  const startDay = subDays(start, startDayMonth);
  const endDay = addDays(end, 6 - endDayMonth);
  const startString = format(startDay, "YYYY-MM-DD");
  const endString = format(endDay, "YYYY-MM-DD");
  return { month, startDay, endDay, startString, endString };
};

const getFormatted = d => {
  const number = format(d, "DD");
  const day = format(d, "dd", { locale: de });
  return { number, day };
};

class App extends Component {
  constructor() {
    super();
    this.state = {
      data: null,
      date: new Date()
    };
    this.handleToday = this.handleToday.bind(this);
    this.handleControls = this.handleControls.bind(this);
  }
  componentDidMount() {
    const date = this.state.date;
    this.fetchData(date);
  }
  fetchData(date) {
    const { startString, endString } = getDates(date);
    const url = `http://localhost:3001/5jkpi6td1ahu257t3epemqfaqk%40group.calendar.google.com/${startString}+${endString}`;
    fetch(url)
      .then(res => res.json())
      .then(json => this.setState({ data: json }))
      .catch(err => console.log(err));
  }
  renderEvent(id, timeStr, summary, type, next, style = null) {
    return (
      <div
        key={id}
        style={style}
        className={`event ${type} ${next ? "next" : ""}`}
      >
        {timeStr}
        {summary}
      </div>
    );
  }
  renderEvents(dayObject, dayIndex, rows, rowIndex) {
    const normal = [];
    const day = [];
    const multiday = [];
    const slots = rows[rowIndex].meta.slots;
    const multidayContainer = {
      height: `${slots.length * 24}px`
    };
    for (let ev of dayObject.events) {
      const { id, type } = ev;
      let summary = ev.summary;
      let timeStr = null;
      let next = false;
      if (type === "normal") {
        timeStr = format(ev.start, "HH:mm");
        normal.push(this.renderEvent(id, timeStr, summary, type, next));
      } else if (type === "day") {
        day.push(this.renderEvent(id, timeStr, summary, type, next));
      } else {
        const multidayStyles = {
          top: `${slots.indexOf(ev.id) === 0 ? 1 : slots.indexOf(ev.id) * 24}px`
        };
        next = true;
        if (
          new Date(ev.start).setHours(0, 0, 0, 0) ===
            dayObject.day.setHours(0, 0, 0, 0) ||
          dayIndex === 0
        ) {
          // event starts or is new week
        } else if (
          new Date(ev.end).setHours(0, 0, 0, 0) ===
          addDays(dayObject.day, 1).setHours(0, 0, 0, 0)
        ) {
          summary = null;
          next = false;
        } else {
          summary = null;
        }
        multiday.push(
          this.renderEvent(id, timeStr, summary, type, next, multidayStyles)
        );
      }
    }
    const restContainer = {
      top: `${multiday.length * 24}px`
    };
    return (
      <div className="event-container">
        <div style={multidayContainer} className="multiday-container">
          {multiday}
        </div>
        <div style={restContainer} className="rest-container">
          {day}
          {normal}
        </div>
      </div>
    );
  }
  renderDayNumer(day) {
    let number = day.formatted.number;
    let currentDay = false;
    if (day.day.setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0)) {
      currentDay = true;
    }
    if (number === "01") {
      number = format(day.day, "DD. MMM.", { locale: de });
    }
    return (
      <div className={`week-day-number ${currentDay ? "active" : ""}`}>
        <h2>{number}</h2>
      </div>
    );
  }
  futureDate(day) {
    let str = "past";
    if (day.day.setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0)) {
      str = "current";
    }
    if (day.day.setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0)) {
      str = "future";
    }
    return str;
  }
  handleToday() {
    this.setState(prevState => {
      const date = new Date();
      this.fetchData(date);
      return { date };
    });
  }
  handleControls(direction) {
    if (direction === "next") {
      this.setState(prevState => {
        const activeDate = prevState.date;
        const nextDate = addMonths(activeDate, 1);
        this.fetchData(nextDate);
        return { date: nextDate };
      });
    } else {
      this.setState(prevState => {
        const activeDate = prevState.date;
        const nextDate = subMonths(activeDate, 1);
        this.fetchData(nextDate);
        return { date: nextDate };
      });
    }
  }
  render() {
    if (this.state.data === null) {
      return <p>loading</p>;
    }

    const events = this.state.data;
    const date = this.state.date;
    const structure = setupDataStructure(date);
    const arr = mapEventsToStructure(structure, events);
    const currenDate = format(this.state.date, "MMMM YYYY", { locale: de });
    return (
      <div className="wrapper">
        <div className="calendar-container">
          <header className="control-header">
            <button className="button" onClick={this.handleToday}>
              Heute
            </button>
            <div className="controls">
              <Prev onClick={() => this.handleControls("prev")} />
              <Next onClick={() => this.handleControls("next")} />
            </div>
            <div className="current">{currenDate}</div>
          </header>
          <div className="days">
            {arr.map((row, index) =>
              row.days.map((el, i) => (
                <div
                  className={`week-day slot-${i} ${
                    arr.length - 1 === index ? "last-row" : ""
                  }  ${this.futureDate(el)}`}
                  key={`${el.number}${el.day}${index}-${i}`}
                >
                  <div className={`week-day-name row-${index}`}>
                    {el.formatted.day}
                  </div>
                  {this.renderDayNumer(el)}
                  {this.renderEvents(el, i, arr, index)}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default App;
