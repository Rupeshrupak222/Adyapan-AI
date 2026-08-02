import type { Request, Response, NextFunction } from "express";
import {
  getAdminOrganizationsService,
  createOrganizationService,
  updateOrganizationService,
  deleteOrganizationService,
  getOrganizationStudentsService,
  bulkRegisterStudentsService,
} from "../services/organization.service";

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
    res.json({ success: true, organization, message: `${type || "Organization"} created successfully!` });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Failed to create organization." });
  }
}

export async function updateAdminOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const organization = await updateOrganizationService(id, req.body);
    res.json({ success: true, organization, message: "Organization updated successfully!" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Failed to update organization." });
  }
}

export async function deleteAdminOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    await deleteOrganizationService(id);
    res.json({ success: true, message: "Organization deleted successfully!" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Failed to delete organization." });
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
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Bulk registration failed." });
  }
}
