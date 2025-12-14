import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, FileText,
    Car, Camera, AlertTriangle, CheckCircle, MapPin, Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const EVENT_TYPES = {
    bast_submit: { label: 'BAST Submit', color: 'bg-blue-500', icon: FileText },
    bast_approve: { label: 'BAST Approve', color: 'bg-green-500', icon: CheckCircle },
    bast_deadline: { label: 'BAST Deadline', color: 'bg-red-500', icon: AlertTriangle },
    car_stnk: { label: 'STNK Expire', color: 'bg-orange-500', icon: Car },
    car_pajak: { label: 'Pajak Expire', color: 'bg-yellow-500', icon: Car },
    car_kir: { label: 'KIR Expire', color: 'bg-purple-500', icon: Wrench },
    cctv_install: { label: 'CCTV Install', color: 'bg-cyan-500', icon: Camera },
};

const CalendarView = ({ workTrackers = [], carData = [], cctvData = [] }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [eventFilter, setEventFilter] = useState('all');

    // Get calendar data
    const calendarData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // First day of month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay(); // 0 = Sunday
        const totalDays = lastDay.getDate();

        // Days from previous month
        const prevMonthDays = [];
        if (startingDay > 0) {
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            for (let i = startingDay - 1; i >= 0; i--) {
                prevMonthDays.push({
                    date: prevMonthLastDay - i,
                    isCurrentMonth: false,
                    fullDate: new Date(year, month - 1, prevMonthLastDay - i),
                });
            }
        }

        // Days of current month
        const currentMonthDays = [];
        for (let i = 1; i <= totalDays; i++) {
            currentMonthDays.push({
                date: i,
                isCurrentMonth: true,
                fullDate: new Date(year, month, i),
            });
        }

        // Days from next month to fill grid
        const totalCells = 42; // 6 rows x 7 days
        const nextMonthDays = [];
        const remaining = totalCells - prevMonthDays.length - currentMonthDays.length;
        for (let i = 1; i <= remaining; i++) {
            nextMonthDays.push({
                date: i,
                isCurrentMonth: false,
                fullDate: new Date(year, month + 1, i),
            });
        }

        return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
    }, [currentDate]);

    // Generate events from data
    const events = useMemo(() => {
        const eventList = [];

        // BAST events from work trackers
        workTrackers.forEach(tracker => {
            if (tracker.bast_submit_date) {
                eventList.push({
                    id: `bast_submit_${tracker.id}`,
                    date: new Date(tracker.bast_submit_date),
                    type: 'bast_submit',
                    title: `BAST Submit: ${tracker.site_name}`,
                    details: {
                        siteId: tracker.site_id_1,
                        siteName: tracker.site_name,
                        regional: tracker.regional,
                        status: tracker.status_pekerjaan,
                    },
                });
            }
            if (tracker.bast_approve_date) {
                eventList.push({
                    id: `bast_approve_${tracker.id}`,
                    date: new Date(tracker.bast_approve_date),
                    type: 'bast_approve',
                    title: `BAST Approved: ${tracker.site_name}`,
                    details: {
                        siteId: tracker.site_id_1,
                        siteName: tracker.site_name,
                        regional: tracker.regional,
                        agingDays: tracker.aging_days,
                    },
                });
            }
            // Show deadline reminders for waiting approval (14 days after submit)
            if (tracker.bast_submit_date && !tracker.bast_approve_date) {
                const submitDate = new Date(tracker.bast_submit_date);
                const deadlineDate = new Date(submitDate.getTime() + 14 * 24 * 60 * 60 * 1000);
                eventList.push({
                    id: `bast_deadline_${tracker.id}`,
                    date: deadlineDate,
                    type: 'bast_deadline',
                    title: `Deadline: ${tracker.site_name}`,
                    details: {
                        siteId: tracker.site_id_1,
                        siteName: tracker.site_name,
                        regional: tracker.regional,
                        submitDate: tracker.bast_submit_date,
                    },
                });
            }
        });

        // Car expiry events
        carData.forEach(car => {
            if (car.masa_berlaku_stnk) {
                eventList.push({
                    id: `car_stnk_${car.id}`,
                    date: new Date(car.masa_berlaku_stnk),
                    type: 'car_stnk',
                    title: `STNK Expire: ${car.nomor_polisi}`,
                    details: {
                        nopol: car.nomor_polisi,
                        area: car.area,
                    },
                });
            }
            if (car.masa_berlaku_pajak) {
                eventList.push({
                    id: `car_pajak_${car.id}`,
                    date: new Date(car.masa_berlaku_pajak),
                    type: 'car_pajak',
                    title: `Pajak Expire: ${car.nomor_polisi}`,
                    details: {
                        nopol: car.nomor_polisi,
                        area: car.area,
                    },
                });
            }
            if (car.masa_berlaku_kir) {
                eventList.push({
                    id: `car_kir_${car.id}`,
                    date: new Date(car.masa_berlaku_kir),
                    type: 'car_kir',
                    title: `KIR Expire: ${car.nomor_polisi}`,
                    details: {
                        nopol: car.nomor_polisi,
                        area: car.area,
                    },
                });
            }
        });

        // CCTV install events
        cctvData.forEach(cctv => {
            if (cctv.install_date) {
                eventList.push({
                    id: `cctv_install_${cctv.id}`,
                    date: new Date(cctv.install_date),
                    type: 'cctv_install',
                    title: `CCTV Install: ${cctv.site_name}`,
                    details: {
                        siteId: cctv.site_id_display,
                        siteName: cctv.site_name,
                        regional: cctv.regional,
                        merk: cctv.merk_cctv,
                    },
                });
            }
        });

        return eventList;
    }, [workTrackers, carData, cctvData]);

    // Get events for a specific date
    const getEventsForDate = (date) => {
        return events.filter(event => {
            const eventDate = event.date;
            const isSameDay = eventDate.getFullYear() === date.getFullYear() &&
                eventDate.getMonth() === date.getMonth() &&
                eventDate.getDate() === date.getDate();

            if (!isSameDay) return false;
            if (eventFilter === 'all') return true;
            return event.type.startsWith(eventFilter);
        });
    };

    // Events for selected date
    const selectedDateEvents = useMemo(() => {
        if (!selectedDate) return [];
        return getEventsForDate(selectedDate);
    }, [selectedDate, events, eventFilter]);

    // Upcoming events (next 7 days)
    const upcomingEvents = useMemo(() => {
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        return events
            .filter(event => {
                if (eventFilter !== 'all' && !event.type.startsWith(eventFilter)) return false;
                return event.date >= now && event.date <= weekFromNow;
            })
            .sort((a, b) => a.date - b.date)
            .slice(0, 10);
    }, [events, eventFilter]);

    // Navigation handlers
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(new Date());
    };

    const isToday = (date) => {
        const today = new Date();
        return date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate();
    };

    const isSelected = (date) => {
        if (!selectedDate) return false;
        return date.getFullYear() === selectedDate.getFullYear() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getDate() === selectedDate.getDate();
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (date) => {
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6" />
                        Calendar View
                    </h2>
                    <p className="text-muted-foreground">Track deadlines, events, dan schedule</p>
                </div>
                <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter Events" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Events</SelectItem>
                        <SelectItem value="bast">BAST Events</SelectItem>
                        <SelectItem value="car">Car Documents</SelectItem>
                        <SelectItem value="cctv">CCTV Events</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle>
                                    {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={goToToday}>
                                        Hari Ini
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Day Headers */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
                                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {calendarData.map((day, index) => {
                                    const dayEvents = getEventsForDate(day.fullDate);
                                    const hasEvents = dayEvents.length > 0;

                                    return (
                                        <motion.button
                                            key={index}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setSelectedDate(day.fullDate)}
                                            className={cn(
                                                "relative aspect-square p-1 rounded-lg text-sm transition-colors",
                                                day.isCurrentMonth ? "text-foreground" : "text-muted-foreground/50",
                                                isToday(day.fullDate) && "bg-primary text-primary-foreground font-bold",
                                                isSelected(day.fullDate) && !isToday(day.fullDate) && "bg-accent border-2 border-primary",
                                                !isToday(day.fullDate) && !isSelected(day.fullDate) && "hover:bg-muted"
                                            )}
                                        >
                                            <span className="block text-center">{day.date}</span>
                                            {hasEvents && (
                                                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                                                    {dayEvents.slice(0, 3).map((event, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={cn("w-1.5 h-1.5 rounded-full", EVENT_TYPES[event.type]?.color || 'bg-gray-400')}
                                                        />
                                                    ))}
                                                    {dayEvents.length > 3 && (
                                                        <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 3}</span>
                                                    )}
                                                </div>
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
                                {Object.entries(EVENT_TYPES).map(([key, val]) => (
                                    <div key={key} className="flex items-center gap-1.5 text-xs">
                                        <div className={cn("w-2.5 h-2.5 rounded-full", val.color)} />
                                        <span className="text-muted-foreground">{val.label}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Selected Date Events */}
                    <AnimatePresence mode="wait">
                        {selectedDate && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="mt-4"
                            >
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">
                                            Events pada {formatDate(selectedDate)}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {selectedDateEvents.length === 0 ? (
                                            <p className="text-muted-foreground text-sm text-center py-4">
                                                Tidak ada event pada tanggal ini
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                {selectedDateEvents.map(event => {
                                                    const eventType = EVENT_TYPES[event.type];
                                                    const Icon = eventType?.icon || CalendarIcon;

                                                    return (
                                                        <div
                                                            key={event.id}
                                                            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                                        >
                                                            <div className={cn("p-2 rounded-full text-white", eventType?.color || 'bg-gray-400')}>
                                                                <Icon className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-sm truncate">{event.title}</p>
                                                                {event.details && (
                                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                                        {event.details.regional && (
                                                                            <Badge variant="outline" className="text-xs">
                                                                                <MapPin className="w-3 h-3 mr-1" />
                                                                                {event.details.regional}
                                                                            </Badge>
                                                                        )}
                                                                        {event.details.agingDays && (
                                                                            <Badge variant="outline" className="text-xs">
                                                                                <Clock className="w-3 h-3 mr-1" />
                                                                                {event.details.agingDays} days
                                                                            </Badge>
                                                                        )}
                                                                        {event.details.nopol && (
                                                                            <Badge variant="outline" className="text-xs">
                                                                                {event.details.nopol}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Sidebar - Upcoming Events */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Upcoming (7 Hari)
                            </CardTitle>
                            <CardDescription>Event yang akan datang</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {upcomingEvents.length === 0 ? (
                                <p className="text-muted-foreground text-sm text-center py-4">
                                    Tidak ada event dalam 7 hari ke depan
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {upcomingEvents.map(event => {
                                        const eventType = EVENT_TYPES[event.type];
                                        const Icon = eventType?.icon || CalendarIcon;

                                        return (
                                            <motion.div
                                                key={event.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                                onClick={() => setSelectedDate(event.date)}
                                            >
                                                <div className={cn("p-1.5 rounded-full text-white shrink-0", eventType?.color || 'bg-gray-400')}>
                                                    <Icon className="w-3 h-3" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-xs truncate">{event.title}</p>
                                                    <p className="text-xs text-muted-foreground">{formatTime(event.date)}</p>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Event Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">BAST Waiting</span>
                                    <Badge variant="outline" className="bg-orange-500/10 text-orange-600">
                                        {workTrackers.filter(t => t.bast_submit_date && !t.bast_approve_date).length}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Car Docs Expiring</span>
                                    <Badge variant="outline" className="bg-red-500/10 text-red-600">
                                        {carData.filter(c => {
                                            const now = new Date();
                                            const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                                            return [c.masa_berlaku_stnk, c.masa_berlaku_pajak, c.masa_berlaku_kir]
                                                .some(date => date && new Date(date) <= thirtyDays);
                                        }).length}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">This Month Events</span>
                                    <Badge variant="outline">
                                        {events.filter(e =>
                                            e.date.getMonth() === currentDate.getMonth() &&
                                            e.date.getFullYear() === currentDate.getFullYear()
                                        ).length}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CalendarView;
