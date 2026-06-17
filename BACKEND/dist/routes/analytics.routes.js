"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const analytics_controller_1 = require("../controllers/analytics.controller");
const router = (0, express_1.Router)();
// Get task analytics/graphs data for a specific project
router.get("/:projectId", auth_middleware_1.userauth, analytics_controller_1.getProjectAnalyticsController);
exports.default = router;
