import client, { downloadFile } from './client';

export const listAuditLogs = (params) => client.get('/audit/logs/', { params }).then((r) => r.data);

export const exportAuditLogs = () => downloadFile('/audit/logs/export/', 'audit_log.csv');
