import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  TriggerType,
  TimestampTrigger,
  Event,
  EventType,
} from '@notifee/react-native';
import { Linking } from 'react-native';

class NotificationService {
  private isInitialized = false;

  /**
   * Initializes Notifee and Firebase Cloud Messaging handlers.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[NotificationService] Service is already initialized.');
      return;
    }

    try {
      // 1. Request FCM permission
      await this.requestPermissions();

      // 2. Create standard Android channel required for notifications
      await notifee.createChannel({
        id: 'task_reminders',
        name: 'Task Reminders',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });

      // 3. Handle Foreground messages
      messaging().onMessage(async (remoteMessage) => {
        console.log('[NotificationService] Foreground message received:', remoteMessage);
        await this.displayLocalNotification(remoteMessage);
      });

      // 4. Handle Notification click events when the app is in foreground/background
      notifee.onForegroundEvent((event: Event) => {
        this.handleNotificationEvent(event);
      });

      // 5. Handle initial notification check if the app was launched by clicking a notification
      const initialNotification = await notifee.getInitialNotification();
      if (initialNotification && initialNotification.notification) {
        console.log('[NotificationService] App launched via notification click:', initialNotification);
        this.handleDeepLink(initialNotification.notification.data);
      }

      // 6. Handle background notifications click intent (FCM fallback)
      messaging().onNotificationOpenedApp((remoteMessage) => {
        console.log('[NotificationService] Background message clicked:', remoteMessage);
        this.handleDeepLink(remoteMessage.data);
      });

      this.isInitialized = true;
      console.log('[NotificationService] Initialized messaging and local channels.');
    } catch (error) {
      console.error('[NotificationService] Failed to initialize notifications:', error);
    }
  }

  /**
   * Requests necessary user permissions for sending notifications.
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      console.log('[NotificationService] FCM Authorization status:', authStatus);

      // Also request Notifee permissions for iOS specifically
      await notifee.requestPermission();

      return enabled;
    } catch (error) {
      console.error('[NotificationService] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Fetches the device FCM registration token.
   */
  async getDeviceToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      console.log('[NotificationService] Device FCM Token:', token);
      return token;
    } catch (error) {
      console.error('[NotificationService] Failed to fetch device token:', error);
      return null;
    }
  }

  /**
   * Displays a local pop-up notification from a received FCM message.
   */
  private async displayLocalNotification(message: FirebaseMessagingTypes.RemoteMessage): Promise<void> {
    const title = message.notification?.title || (typeof message.data?.title === 'string' ? message.data.title : 'Task Update');
    const body = message.notification?.body || (typeof message.data?.body === 'string' ? message.data.body : 'You have updates.');

    try {
      await notifee.displayNotification({
        title,
        body,
        data: message.data,
        android: {
          channelId: 'task_reminders',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
        },
      });
    } catch (error) {
      console.error('[NotificationService] Failed to display local notification:', error);
    }
  }

  /**
   * Schedules a local notification for a specific date (e.g. task due date).
   */
  async scheduleDueDateReminder(taskId: string, title: string, dueDate: Date): Promise<void> {
    try {
      const triggerTime = dueDate.getTime();
      if (triggerTime <= Date.now()) {
        console.warn('[NotificationService] Due date is in the past, skipping schedule.');
        return;
      }

      // Create a timestamp-based trigger
      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerTime,
      };

      await notifee.createTriggerNotification(
        {
          id: `reminder_${taskId}`,
          title: 'Task Due Reminder',
          body: `The task "${title}" is due now.`,
          data: { taskId, screen: 'TaskDetail' },
          android: {
            channelId: 'task_reminders',
            importance: AndroidImportance.HIGH,
            pressAction: {
              id: 'default',
            },
          },
        },
        trigger
      );

      console.log(`[NotificationService] Scheduled reminder for task ${taskId} at ${dueDate.toISOString()}`);
    } catch (error) {
      console.error(`[NotificationService] Failed to schedule reminder for task ${taskId}:`, error);
    }
  }

  /**
   * Cancels a scheduled local notification.
   */
  async cancelDueDateReminder(taskId: string): Promise<void> {
    try {
      await notifee.cancelNotification(`reminder_${taskId}`);
      console.log(`[NotificationService] Cancelled scheduled reminder for task ${taskId}`);
    } catch (error) {
      console.error(`[NotificationService] Failed to cancel reminder for task ${taskId}:`, error);
    }
  }

  /**
   * Handles user clicks on foreground or background notifications.
   */
  private handleNotificationEvent(event: Event): void {
    const { type, detail } = event;

    if (type === EventType.PRESS && detail.notification) {
      console.log('[NotificationService] User pressed notification:', detail.notification);
      this.handleDeepLink(detail.notification.data);
    }
  }

  /**
   * Resolves notification data and initiates deep-linking transitions.
   */
  private handleDeepLink(data?: Record<string, string | number | object>): void {
    if (!data) return;

    try {
      const screen = typeof data.screen === 'string' ? data.screen : undefined;
      const taskId = typeof data.taskId === 'string' ? data.taskId : undefined;

      if (screen === 'TaskDetail' && taskId) {
        const linkUrl = `taskify://task/${taskId}`;
        console.log(`[NotificationService] Directing user to deep link: ${linkUrl}`);
        Linking.openURL(linkUrl).catch((err) =>
          console.error('[NotificationService] Failed to open deep-link URL:', err)
        );
      }
    } catch (error) {
      console.error('[NotificationService] Error executing deep-link routing:', error);
    }
  }
}

// Background Messaging Handler (FCM setup requirement)
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[NotificationService] Background message handled:', remoteMessage);
  // No direct UI interactions here, code executes in background JS engine
});

export const notificationService = new NotificationService();
export default notificationService;
