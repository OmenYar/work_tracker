import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, BellRing, AlertTriangle, Clock, Car, Camera, FileText,
    X, Check, ChevronRight, Settings, Mail, Calendar, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { cn } from '@/lib/utils';

// Notification types configuration
const NOTIFICATION_TYPES = {
    bast_deadline: {
        icon: FileText,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        label: 'BAST Deadline',
        priority: 'high',
    },
    bast_pending: {
        icon: Clock,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        label: 'BAST Pending',
        priority: 'medium',
    },
    car_stnk_expiring: {
        icon: Car,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        label: 'STNK Expiring',
        priority: 'high',
    },
    car_pajak_expiring: {
        icon: Car,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        label: 'Pajak Expiring',
        priority: 'high',
    },
    car_kir_expiring: {
        icon: Car,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        label: 'KIR Expiring',
        priority: 'medium',
    },
    on_hold_reminder: {
        icon: AlertTriangle,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        label: 'On Hold Reminder',
        priority: 'medium',
    },
    status_change: {
        icon: Bell,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        label: 'Status Change',
        priority: 'low',
    },
};

// Check if browser supports notifications
const isBrowserNotificationSupported = () => {
    return 'Notification' in window;
};

// Request browser notification permission
const requestNotificationPermission = async () => {
    if (!isBrowserNotificationSupported()) return false;

    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
};

// Send browser push notification
const sendPushNotification = (title, body, options = {}) => {
    if (!isBrowserNotificationSupported()) return;
    if (Notification.permission !== 'granted') return;

    const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: options.tag || 'default',
        ...options,
    });

    if (options.onClick) {
        notification.onclick = options.onClick;
    }

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    return notification;
};

const NotificationCenter = ({
    workTrackers = [],
    carData = [],
    cctvData = [],
    onNavigate,
}) => {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [dismissedIds, setDismissedIds] = useState(() => {
        const saved = localStorage.getItem('dismissedNotifications');
        return saved ? JSON.parse(saved) : [];
    });
    const [notificationSettings, setNotificationSettings] = useState(() => {
        const saved = localStorage.getItem('notificationSettings');
        return saved ? JSON.parse(saved) : {
            pushEnabled: false,
            emailEnabled: false,
            bastDeadlineDays: 3,
            carExpiryDays: 30,
            onHoldDays: 14,
        };
    });
    const [showSettings, setShowSettings] = useState(false);

    // Save dismissed notifications
    useEffect(() => {
        localStorage.setItem('dismissedNotifications', JSON.stringify(dismissedIds));
    }, [dismissedIds]);

    // Save notification settings
    useEffect(() => {
        localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
    }, [notificationSettings]);

    // Generate notifications from data
    const notifications = useMemo(() => {
        const alerts = [];
        const now = new Date();
        const { bastDeadlineDays, carExpiryDays, onHoldDays } = notificationSettings;

        // BAST Deadline Alerts (pending approval approaching deadline)
        workTrackers.forEach(tracker => {
            // BAST pending approval
            if (tracker.bast_submit_date && !tracker.bast_approve_date) {
                const submitDate = new Date(tracker.bast_submit_date);
                const deadlineDate = new Date(submitDate.getTime() + 14 * 24 * 60 * 60 * 1000);
                const daysUntilDeadline = Math.ceil((deadlineDate - now) / (24 * 60 * 60 * 1000));

                if (daysUntilDeadline <= bastDeadlineDays && daysUntilDeadline > 0) {
                    alerts.push({
                        id: `bast_deadline_${tracker.id}`,
                        type: 'bast_deadline',
                        title: `BAST Deadline: ${tracker.site_name}`,
                        message: `BAST approval deadline in ${daysUntilDeadline} day(s)`,
                        data: tracker,
                        date: deadlineDate,
                        daysLeft: daysUntilDeadline,
                    });
                } else if (daysUntilDeadline <= 0) {
                    alerts.push({
                        id: `bast_overdue_${tracker.id}`,
                        type: 'bast_deadline',
                        title: `BAST OVERDUE: ${tracker.site_name}`,
                        message: `BAST approval is ${Math.abs(daysUntilDeadline)} day(s) overdue!`,
                        data: tracker,
                        date: deadlineDate,
                        daysLeft: daysUntilDeadline,
                        isOverdue: true,
                    });
                }
            }

            // On Hold Reminder
            if (tracker.status_pekerjaan === 'On Hold') {
                const createdDate = new Date(tracker.created_at);
                const daysSinceCreated = Math.floor((now - createdDate) / (24 * 60 * 60 * 1000));

                if (daysSinceCreated >= onHoldDays) {
                    alerts.push({
                        id: `on_hold_${tracker.id}`,
                        type: 'on_hold_reminder',
                        title: `On Hold: ${tracker.site_name}`,
                        message: `This job has been on hold for ${daysSinceCreated} days`,
                        data: tracker,
                        date: createdDate,
                        daysOnHold: daysSinceCreated,
                    });
                }
            }
        });

        // Car Document Expiry Alerts
        carData.forEach(car => {
            const checkExpiry = (dateStr, type, label) => {
                if (!dateStr) return;
                const expiryDate = new Date(dateStr);
                const daysUntilExpiry = Math.ceil((expiryDate - now) / (24 * 60 * 60 * 1000));

                if (daysUntilExpiry <= carExpiryDays && daysUntilExpiry > 0) {
                    alerts.push({
                        id: `${type}_${car.id}`,
                        type: type,
                        title: `${label} Expiring: ${car.nomor_polisi}`,
                        message: `${label} expires in ${daysUntilExpiry} day(s)`,
                        data: car,
                        date: expiryDate,
                        daysLeft: daysUntilExpiry,
                    });
                } else if (daysUntilExpiry <= 0) {
                    alerts.push({
                        id: `${type}_expired_${car.id}`,
                        type: type,
                        title: `${label} EXPIRED: ${car.nomor_polisi}`,
                        message: `${label} expired ${Math.abs(daysUntilExpiry)} day(s) ago!`,
                        data: car,
                        date: expiryDate,
                        daysLeft: daysUntilExpiry,
                        isOverdue: true,
                    });
                }
            };

            checkExpiry(car.masa_berlaku_stnk, 'car_stnk_expiring', 'STNK');
            checkExpiry(car.masa_berlaku_pajak, 'car_pajak_expiring', 'Pajak');
            checkExpiry(car.masa_berlaku_kir, 'car_kir_expiring', 'KIR');
        });

        // Filter out dismissed notifications
        return alerts
            .filter(alert => !dismissedIds.includes(alert.id))
            .sort((a, b) => {
                // Sort by priority first, then by date
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                const aPriority = NOTIFICATION_TYPES[a.type]?.priority || 'low';
                const bPriority = NOTIFICATION_TYPES[b.type]?.priority || 'low';

                if (priorityOrder[aPriority] !== priorityOrder[bPriority]) {
                    return priorityOrder[aPriority] - priorityOrder[bPriority];
                }
                return (a.daysLeft || 0) - (b.daysLeft || 0);
            });
    }, [workTrackers, carData, dismissedIds, notificationSettings]);

    // High priority count (for badge)
    const highPriorityCount = useMemo(() => {
        return notifications.filter(n =>
            NOTIFICATION_TYPES[n.type]?.priority === 'high' || n.isOverdue
        ).length;
    }, [notifications]);

    // Enable push notifications
    const handleEnablePush = async () => {
        const granted = await requestNotificationPermission();
        if (granted) {
            setNotificationSettings(prev => ({ ...prev, pushEnabled: true }));
            toast({
                title: 'Push Notifications Enabled',
                description: 'You will receive browser notifications for important alerts.',
            });
        } else {
            toast({
                title: 'Permission Denied',
                description: 'Please enable notifications in your browser settings.',
                variant: 'destructive',
            });
        }
    };

    // Send test notification
    const sendTestNotification = () => {
        sendPushNotification(
            'Test Notification',
            'This is a test notification from Work Tracker',
            { tag: 'test' }
        );
    };

    // Dismiss notification
    const dismissNotification = useCallback((id) => {
        setDismissedIds(prev => [...prev, id]);
    }, []);

    // Dismiss all
    const dismissAll = useCallback(() => {
        setDismissedIds(prev => [...prev, ...notifications.map(n => n.id)]);
    }, [notifications]);

    // Clear dismissed (reset)
    const clearDismissed = useCallback(() => {
        setDismissedIds([]);
    }, []);

    // Send push notifications for high priority items
    useEffect(() => {
        if (!notificationSettings.pushEnabled) return;

        notifications.forEach(notification => {
            if (notification.isOverdue || NOTIFICATION_TYPES[notification.type]?.priority === 'high') {
                // Only send once per session
                const sentKey = `notif_sent_${notification.id}`;
                if (sessionStorage.getItem(sentKey)) return;

                sendPushNotification(notification.title, notification.message, {
                    tag: notification.id,
                });
                sessionStorage.setItem(sentKey, 'true');
            }
        });
    }, [notifications, notificationSettings.pushEnabled]);

    return (
        <div className="relative">
            {/* Notification Bell Button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className="relative"
            >
                {notifications.length > 0 ? (
                    <BellRing className="h-5 w-5" />
                ) : (
                    <Bell className="h-5 w-5" />
                )}
                {notifications.length > 0 && (
                    <span className={cn(
                        "absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center text-white",
                        highPriorityCount > 0 ? "bg-red-500 animate-pulse" : "bg-primary"
                    )}>
                        {notifications.length > 99 ? '99+' : notifications.length}
                    </span>
                )}
            </Button>

            {/* Notification Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute right-0 top-12 z-50 w-96 max-h-[500px] overflow-hidden rounded-xl border bg-card shadow-lg"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b">
                                <div className="flex items-center gap-2">
                                    <Bell className="h-5 w-5" />
                                    <h3 className="font-semibold">Notifications</h3>
                                    {notifications.length > 0 && (
                                        <Badge variant="secondary">{notifications.length}</Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowSettings(!showSettings)}
                                        className="h-8 w-8"
                                    >
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsOpen(false)}
                                        className="h-8 w-8"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Settings Panel */}
                            <AnimatePresence>
                                {showSettings && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-b bg-muted/30 overflow-hidden"
                                    >
                                        <div className="p-4 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Bell className="h-4 w-4" />
                                                    <span className="text-sm">Push Notifications</span>
                                                </div>
                                                <Switch
                                                    checked={notificationSettings.pushEnabled}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            handleEnablePush();
                                                        } else {
                                                            setNotificationSettings(prev => ({ ...prev, pushEnabled: false }));
                                                        }
                                                    }}
                                                />
                                            </div>

                                            {notificationSettings.pushEnabled && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={sendTestNotification}
                                                    className="w-full"
                                                >
                                                    Send Test Notification
                                                </Button>
                                            )}

                                            <div className="pt-2 border-t">
                                                <p className="text-xs text-muted-foreground mb-2">Alert Thresholds</p>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span>BAST Deadline Warning</span>
                                                        <span className="text-muted-foreground">{notificationSettings.bastDeadlineDays} days</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>Car Document Expiry</span>
                                                        <span className="text-muted-foreground">{notificationSettings.carExpiryDays} days</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span>On Hold Reminder</span>
                                                        <span className="text-muted-foreground">{notificationSettings.onHoldDays} days</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearDismissed}
                                                className="w-full text-xs"
                                            >
                                                Reset Dismissed Notifications
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Notifications List */}
                            <div className="overflow-y-auto max-h-[350px]">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p>No notifications</p>
                                        <p className="text-xs mt-1">You're all caught up!</p>
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {notifications.map((notification) => {
                                            const config = NOTIFICATION_TYPES[notification.type];
                                            const Icon = config?.icon || Bell;

                                            return (
                                                <motion.div
                                                    key={notification.id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    className={cn(
                                                        "p-4 hover:bg-muted/50 transition-colors",
                                                        notification.isOverdue && "bg-red-50 dark:bg-red-950/20"
                                                    )}
                                                >
                                                    <div className="flex gap-3">
                                                        <div className={cn(
                                                            "shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                                                            config?.bgColor
                                                        )}>
                                                            <Icon className={cn("h-5 w-5", config?.color)} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <p className={cn(
                                                                    "font-medium text-sm truncate",
                                                                    notification.isOverdue && "text-red-600"
                                                                )}>
                                                                    {notification.title}
                                                                </p>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => dismissNotification(notification.id)}
                                                                    className="h-6 w-6 shrink-0"
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                                {notification.message}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={cn(
                                                                        "text-xs",
                                                                        notification.isOverdue && "border-red-500 text-red-500"
                                                                    )}
                                                                >
                                                                    {notification.isOverdue ? 'OVERDUE' : config?.label}
                                                                </Badge>
                                                                {notification.data?.regional && (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {notification.data.regional}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            {notifications.length > 0 && (
                                <div className="p-3 border-t bg-muted/30">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={dismissAll}
                                        className="w-full text-xs"
                                    >
                                        <Check className="h-3 w-3 mr-1" />
                                        Dismiss All
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

// Standalone Alert Summary Component (for Dashboard)
export const AlertSummary = ({ workTrackers = [], carData = [] }) => {
    const alerts = useMemo(() => {
        const now = new Date();
        const summary = {
            bastOverdue: 0,
            bastDueSoon: 0,
            carDocsExpiring: 0,
            onHoldLong: 0,
        };

        workTrackers.forEach(tracker => {
            if (tracker.bast_submit_date && !tracker.bast_approve_date) {
                const submitDate = new Date(tracker.bast_submit_date);
                const deadlineDate = new Date(submitDate.getTime() + 14 * 24 * 60 * 60 * 1000);
                const daysUntilDeadline = Math.ceil((deadlineDate - now) / (24 * 60 * 60 * 1000));

                if (daysUntilDeadline <= 0) summary.bastOverdue++;
                else if (daysUntilDeadline <= 3) summary.bastDueSoon++;
            }

            if (tracker.status_pekerjaan === 'On Hold') {
                const createdDate = new Date(tracker.created_at);
                const daysSinceCreated = Math.floor((now - createdDate) / (24 * 60 * 60 * 1000));
                if (daysSinceCreated >= 14) summary.onHoldLong++;
            }
        });

        carData.forEach(car => {
            const checkExpiry = (dateStr) => {
                if (!dateStr) return false;
                const expiryDate = new Date(dateStr);
                const daysUntilExpiry = Math.ceil((expiryDate - now) / (24 * 60 * 60 * 1000));
                return daysUntilExpiry <= 30;
            };

            if (checkExpiry(car.masa_berlaku_stnk) ||
                checkExpiry(car.masa_berlaku_pajak) ||
                checkExpiry(car.masa_berlaku_kir)) {
                summary.carDocsExpiring++;
            }
        });

        return summary;
    }, [workTrackers, carData]);

    const totalAlerts = alerts.bastOverdue + alerts.bastDueSoon + alerts.carDocsExpiring + alerts.onHoldLong;

    if (totalAlerts === 0) return null;

    return (
        <Card className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Alerts ({totalAlerts})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    {alerts.bastOverdue > 0 && (
                        <div className="flex items-center gap-2 text-red-600">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            {alerts.bastOverdue} BAST Overdue
                        </div>
                    )}
                    {alerts.bastDueSoon > 0 && (
                        <div className="flex items-center gap-2 text-orange-600">
                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                            {alerts.bastDueSoon} BAST Due Soon
                        </div>
                    )}
                    {alerts.carDocsExpiring > 0 && (
                        <div className="flex items-center gap-2 text-yellow-600">
                            <span className="w-2 h-2 rounded-full bg-yellow-500" />
                            {alerts.carDocsExpiring} Car Docs Expiring
                        </div>
                    )}
                    {alerts.onHoldLong > 0 && (
                        <div className="flex items-center gap-2 text-purple-600">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            {alerts.onHoldLong} Long On Hold
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default NotificationCenter;
