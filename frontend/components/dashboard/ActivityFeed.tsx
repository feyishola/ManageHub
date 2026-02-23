import React from "react";

type ActivityItem = {
    id: string;
    icon: React.ReactNode;
    color?: string;
    description: string;
    timestamp: Date | string;
};

interface ActivityFeedProps {
    activities?: ActivityItem[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities = [] }) => {
    const formatRelativeTime = (time: Date | string) => {
        const date = typeof time === "string" ? new Date(time) : time;
        const diff = Date.now() - date.getTime();

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return "just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    if (activities.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-sm text-gray-500">
                No recent activity
            </div>
        );
    }

    return (
        <div className="max-h-80 overflow-y-auto pr-2">
            <ul className="space-y-4">
                {activities.map((activity) => (
                    <li key={activity.id} className="flex items-start gap-3">
                        {/* Icon */}
                        <div
                            className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
                            style={{ backgroundColor: activity.color ?? "#E5E7EB" }}
                        >
                            {activity.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                            <p className="text-sm text-gray-800">
                                {activity.description}
                            </p>
                            <span className="text-xs text-gray-500">
                                {formatRelativeTime(activity.timestamp)}
                            </span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ActivityFeed;