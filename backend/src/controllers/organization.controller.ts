import type { Request, Response, NextFunction } from "express";
import {
  getAdminOrganizationsService,
  createOrganizationService,
  updateOrganizationService,
  deleteOrganizationService,
  getOrganizationStudentsService,
  bulkRegisterStudentsService,
} from "../services/organization.service";
import { AdminAuditService } from "../services/admin-audit.service";
import { handleRouteError } from "../utils/routeError";

export async function getAdminOrganizations(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getAdminOrganizationsService();
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function createAdminOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, type, code, location, domain, contactEmail } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: "Organization name is required." });
      return;
    }
    const organization = await createOrganizationService({ name, type, code, location, domain, contactEmail });
    await AdminAuditService.log({
      adminId: (req as any).adminUser?.id,
      adminName: (req as any).adminUser?.name,
      action: "Organization Created",
      module: "Organization",
      targetId: organization.id,
      details: { name: organization.name, type: organization.type },
      ipAddress: req.ip,
    });
    res.json({ success: true, organization, message: `${type || "Organization"} created successfully!` });
  } catch (error: any) {
    handleRouteError(res, error, "Organization.create", "Failed to create organization.");
  }
}

export async function updateAdminOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const organization = await updateOrganizationService(id, req.body);
    await AdminAuditService.log({
      adminId: (req as any).adminUser?.id,
      adminName: (req as any).adminUser?.name,
      action: "Organization Updated",
      module: "Organization",
      targetId: id,
      details: { name: organization.name },
      ipAddress: req.ip,
    });
    res.json({ success: true, organization, message: "Organization updated successfully!" });
  } catch (error: any) {
    handleRouteError(res, error, "Organization.update", "Failed to update organization.");
  }
}

export async function deleteAdminOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    await deleteOrganizationService(id);
    await AdminAuditService.log({
      adminId: (req as any).adminUser?.id,
      adminName: (req as any).adminUser?.name,
      action: "Organization Deleted",
      module: "Organization",
      targetId: id,
      ipAddress: req.ip,
    });
    res.json({ success: true, message: "Organization deleted successfully!" });
  } catch (error: any) {
    handleRouteError(res, error, "Organization.delete", "Failed to delete organization.");
  }
}

export async function getOrganizationStudents(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const result = await getOrganizationStudentsService(id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function bulkRegisterOrganizationStudents(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgName, students } = req.body;
    if (!orgName || !Array.isArray(students) || students.length === 0) {
      res.status(400).json({ success: false, message: "orgName and students list are required." });
      return;
    }

    const result = await bulkRegisterStudentsService(orgName, students);
    await AdminAuditService.log({
      adminId: (req as any).adminUser?.id,
      adminName: (req as any).adminUser?.name,
      action: "Students Bulk Registered",
      module: "Organization",
      targetId: null,
      details: { orgName, registeredCount: result.registeredCount, errors: result.errors },
      ipAddress: req.ip,
    });
    res.json({ success: true, ...result });
  } catch (error: any) {
    handleRouteError(res, error, "Organization.bulkRegister", "Bulk registration failed.");
  }
}
