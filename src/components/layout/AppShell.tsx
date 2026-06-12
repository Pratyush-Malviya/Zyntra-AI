import {ReactNode, useState} from 'react';
import {
  Box,
  Flex,
  HStack,
  VStack,
  IconButton,
  Text,
  Select,
  Avatar,
  useColorMode,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerOverlay,
  DrawerContent,
  Button,
} from '@chakra-ui/react';
import {
  Sidebar,
  SidebarSection,
  NavItem,
  NavItemLabel,
  SidebarToggleButton,
} from '@saas-ui/react';
import {
  Menu, X, Zap, Activity, Building, Users, Cpu, ShieldCheck,
  CreditCard, LayoutDashboard, Settings, Globe, Check, MessageSquare,
  TrendingUp, Target, Kanban, Sparkles, FileText, List, Sun, Moon,
  LogOut, ChevronRight,
} from 'lucide-react';

export type AppView =
  | 'OUTREACH' | 'RESEARCH' | 'SDR_DAILY' | 'SDR_STATS'
  | 'MGR_DASHBOARD' | 'MGR_APPROVALS' | 'MGR_CALLS' | 'MGR_FORECAST'
  | 'AE_PIPELINE' | 'AE_HEALTH' | 'AE_COPILOT' | 'AE_BRIEFS'
  | 'VIEWER_DASHBOARD' | 'VIEWER_PIPELINE'
  | 'SUPER_ADMIN' | 'SUPER_ADMIN_BILLING'
  | 'ORG_DASHBOARD' | 'ORG_MEMBERS' | 'ORG_BRANDING' | 'ORG_DOMAIN' | 'ORG_BILLING' | 'ORG_FEATURES' | 'ORG_SECURITY'
  | 'SETTINGS' | 'TEAM_ADMIN' | 'JOURNEY' | 'ANALYTICS';

export type SuperAdminTab = 'dashboard' | 'employees_list' | 'add_employees' | 'organizations' | 'enterprise_suite' | 'llm_config';
export type UserRole = 'super_admin' | 'org_admin' | 'sdr' | 'manager' | 'ae' | 'viewer';

interface AppShellProps {
  children: ReactNode;
  activeView: AppView;
  onViewChange: (view: AppView, subTab?: string) => void;
  superAdminTab: SuperAdminTab;
  onSuperAdminTabChange: (tab: SuperAdminTab) => void;
  simulatedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  user: any;
  profile: any;
  onLogout: () => void;
}

const tierBadge = (label: string, color: string) => (
  <Text
    fontSize="8px"
    fontWeight="extrabold"
    textTransform="uppercase"
    letterSpacing="widest"
    textAlign="center"
    bg={`${color}.500/10`}
    borderWidth={1}
    borderColor={`${color}.500/20`}
    rounded="md"
    px={3}
    py={1}
    mb={2}
    color={`${color}.300`}
  >
    {label}
  </Text>
);

function SidebarNavItem({ isActive, onClick, icon, label, labelSecondary }: {
  isActive?: boolean;
  onClick?: () => void;
  icon: React.ReactElement;
  label: string;
  labelSecondary?: string;
}) {
  return (
    <NavItem isActive={isActive} onClick={onClick} icon={icon}>
      <NavItemLabel>
        <Text fontSize="sm" fontWeight="medium">{label}</Text>
        {labelSecondary && <Text fontSize="xs" color="gray.400">{labelSecondary}</Text>}
      </NavItemLabel>
    </NavItem>
  );
}

export function AppShell({
  children, activeView, onViewChange, superAdminTab, onSuperAdminTabChange,
  simulatedRole, onRoleChange, user, profile, onLogout,
}: AppShellProps) {
  const {colorMode, toggleColorMode} = useColorMode();
  const {isOpen: isMobileOpen, onOpen: onMobileOpen, onClose: onMobileClose} = useDisclosure();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('zyntra-menu-collapsed') === 'true');

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('zyntra-menu-collapsed', String(next));
  };

  const handleNav = (view: AppView, subTab?: string) => {
    onViewChange(view, subTab);
    onMobileClose();
  };

  const navWidth = collapsed ? '80px' : '256px';

  const sidebarContent = (inDrawer: boolean) => (
    <VStack h="full" spacing={0} align="stretch">
      {/* Logo */}
      <Flex
        p={4}
        align="center"
        justify={collapsed && !inDrawer ? 'center' : 'space-between'}
        gap={3}
      >
        <Flex align="center" gap={3}>
          <Flex
            w={10} h={10}
            rounded="2xl"
            bgGradient="linear(to-br, brand.500, brand.300)"
            align="center" justify="center"
            boxShadow="lg"
          >
            <Zap size={24} color="white" fill="white" />
          </Flex>
          {(!collapsed || inDrawer) && (
            <Box>
              <Text fontWeight="extrabold" fontSize="xl" lineHeight="tight" color="whiteAlpha.900">
                Zyntra AI
              </Text>
              <Text fontSize="8px" fontWeight="bold" textTransform="uppercase" letterSpacing="0.2em" color="whiteAlpha.500">
                Enterprise v1.0
              </Text>
            </Box>
          )}
        </Flex>
        {!inDrawer && (
          <SidebarToggleButton onClick={toggleCollapsed} />
        )}
        {inDrawer && (
          <IconButton
            aria-label="Close menu"
            icon={<X size={20} />}
            variant="ghost"
            size="sm"
            onClick={onMobileClose}
          />
        )}
      </Flex>

      {/* Nav Items */}
      <Box flex={1} overflowY="auto" px={4} py={6}>
        {/* Super Admin */}
        {simulatedRole === 'super_admin' && (
          <SidebarSection>
            {tierBadge('TIER 1 — Super Admin', 'purple')}
            <SidebarNavItem
              isActive={activeView === 'SUPER_ADMIN' && superAdminTab === 'dashboard'}
              onClick={() => handleNav('SUPER_ADMIN', 'dashboard')}
              icon={<Activity size={18} />}
              label="Command Dashboard"
              labelSecondary="SaaS Metrics Central"
            />
            <SidebarNavItem
              isActive={activeView === 'SUPER_ADMIN' && superAdminTab === 'organizations'}
              onClick={() => handleNav('SUPER_ADMIN', 'organizations')}
              icon={<Building size={18} />}
              label="Manage Orgs"
              labelSecondary="Tenant Provisioning"
            />
            <SidebarNavItem
              isActive={activeView === 'SUPER_ADMIN' && superAdminTab === 'employees_list'}
              onClick={() => handleNav('SUPER_ADMIN', 'employees_list')}
              icon={<Users size={18} />}
              label="Employees Directory"
              labelSecondary="Global Directory Map"
            />
            <SidebarNavItem
              isActive={activeView === 'SUPER_ADMIN' && superAdminTab === 'llm_config'}
              onClick={() => handleNav('SUPER_ADMIN', 'llm_config')}
              icon={<Cpu size={18} />}
              label="LLM Routing Hub"
              labelSecondary="Failovers & Metering"
            />
            <SidebarNavItem
              isActive={activeView === 'SUPER_ADMIN' && superAdminTab === 'enterprise_suite'}
              onClick={() => handleNav('SUPER_ADMIN', 'enterprise_suite')}
              icon={<ShieldCheck size={18} />}
              label="Enterprise Audit"
              labelSecondary="Compliance & SSO Logs"
            />
            <SidebarNavItem
              isActive={activeView === 'SUPER_ADMIN_BILLING'}
              onClick={() => handleNav('SUPER_ADMIN_BILLING')}
              icon={<CreditCard size={18} />}
              label="Platform Gateways"
              labelSecondary="MRR & Subscription Fee"
            />
          </SidebarSection>
        )}

        {/* Org Admin */}
        {simulatedRole === 'org_admin' && (
          <SidebarSection>
            {tierBadge('TIER 2 — Org Admin', 'blue')}
            <SidebarNavItem
              isActive={activeView === 'ORG_DASHBOARD'}
              onClick={() => handleNav('ORG_DASHBOARD')}
              icon={<LayoutDashboard size={18} />}
              label="Tenant Overview"
              labelSecondary="Quota & Seat Allocation"
            />
            <SidebarNavItem
              isActive={activeView === 'ORG_MEMBERS'}
              onClick={() => handleNav('ORG_MEMBERS')}
              icon={<Users size={18} />}
              label="Member Directory"
              labelSecondary="Invite & Role Allocation"
            />
            <SidebarNavItem
              isActive={activeView === 'ORG_BRANDING'}
              onClick={() => handleNav('ORG_BRANDING')}
              icon={<Settings size={18} />}
              label="Custom Branding"
              labelSecondary="Themes & Logos Setting"
            />
            <SidebarNavItem
              isActive={activeView === 'ORG_DOMAIN'}
              onClick={() => handleNav('ORG_DOMAIN')}
              icon={<Globe size={18} />}
              label="Branded Domain"
              labelSecondary="DKIM / SPF DNS Wizard"
            />
            <SidebarNavItem
              isActive={activeView === 'ORG_BILLING'}
              onClick={() => handleNav('ORG_BILLING')}
              icon={<CreditCard size={18} />}
              label="Billing & Plans"
              labelSecondary="Enterprise Subscription"
            />
            <SidebarNavItem
              isActive={activeView === 'ORG_FEATURES'}
              onClick={() => handleNav('ORG_FEATURES')}
              icon={<Zap  size={18} />}
              label="Feature Controls"
              labelSecondary="Toggle Admin Modules"
            />
            <SidebarNavItem
              isActive={activeView === 'ORG_SECURITY'}
              onClick={() => handleNav('ORG_SECURITY')}
              icon={<ShieldCheck size={18} />}
              label="Security & MFA"
              labelSecondary="Enforce IP & Sessions"
            />
          </SidebarSection>
        )}

        {/* SDR */}
        {simulatedRole === 'sdr' && (
          <SidebarSection>
            {tierBadge('TIER 3 — SDR Workspace', 'orange')}
            <SidebarNavItem
              isActive={activeView === 'OUTREACH'}
              onClick={() => handleNav('OUTREACH')}
              icon={<Target size={18} />}
              label="Outreach Campaigns"
              labelSecondary="Campaigns & Lead Map"
            />
            <SidebarNavItem
              isActive={activeView === 'RESEARCH'}
              onClick={() => handleNav('RESEARCH')}
              icon={<Globe size={18} />}
              label="Prospect Intel"
              labelSecondary="ICP Research & Dossiers"
            />
            <SidebarNavItem
              isActive={activeView === 'SDR_DAILY'}
              onClick={() => handleNav('SDR_DAILY')}
              icon={<List size={18} />}
              label="Daily Action Queue"
              labelSecondary="Priority tasks due today"
            />
            <SidebarNavItem
              isActive={activeView === 'SDR_STATS'}
              onClick={() => handleNav('SDR_STATS')}
              icon={<TrendingUp size={18} />}
              label="Personal Analytics"
              labelSecondary="Dials & Open Rates"
            />
          </SidebarSection>
        )}

        {/* Manager */}
        {simulatedRole === 'manager' && (
          <SidebarSection>
            {tierBadge('TIER 3 — Manager Dashboard', 'teal')}
            <SidebarNavItem
              isActive={activeView === 'MGR_DASHBOARD'}
              onClick={() => handleNav('MGR_DASHBOARD')}
              icon={<LayoutDashboard size={18} />}
              label="Team Activity Feed"
              labelSecondary="Live outreach stream"
            />
            <SidebarNavItem
              isActive={activeView === 'MGR_APPROVALS'}
              onClick={() => handleNav('MGR_APPROVALS')}
              icon={<Check size={18} />}
              label="Sequence Approvals"
              labelSecondary="Approve SDR copy drafts"
            />
            <SidebarNavItem
              isActive={activeView === 'MGR_CALLS'}
              onClick={() => handleNav('MGR_CALLS')}
              icon={<MessageSquare size={18} />}
              label="Call Coaching"
              labelSecondary="AI summaries & metrics"
            />
            <SidebarNavItem
              isActive={activeView === 'MGR_FORECAST'}
              onClick={() => handleNav('MGR_FORECAST')}
              icon={<TrendingUp size={18} />}
              label="Forecast & Overrides"
              labelSecondary="Manager commits logs"
            />
          </SidebarSection>
        )}

        {/* AE */}
        {simulatedRole === 'ae' && (
          <SidebarSection>
            {tierBadge('TIER 3 — AE Workspace', 'blue')}
            <SidebarNavItem
              isActive={activeView === 'AE_PIPELINE'}
              onClick={() => handleNav('AE_PIPELINE')}
              icon={<Kanban size={18} />}
              label="Deal Pipeline Board"
              labelSecondary="Kanban opportunity flows"
            />
            <SidebarNavItem
              isActive={activeView === 'AE_HEALTH'}
              onClick={() => handleNav('AE_HEALTH')}
              icon={<ShieldCheck size={18} />}
              label="Deal Scoring Health"
              labelSecondary="AI explainability logs"
            />
            <SidebarNavItem
              isActive={activeView === 'AE_COPILOT'}
              onClick={() => handleNav('AE_COPILOT')}
              icon={<Sparkles size={18} />}
              label="AI Copilot CRM Assistant"
              labelSecondary="Query plain English CRM"
            />
            <SidebarNavItem
              isActive={activeView === 'AE_BRIEFS'}
              onClick={() => handleNav('AE_BRIEFS')}
              icon={<FileText size={18} />}
              label="Pre-Call Briefings"
              labelSecondary="Meeting preparation intel"
            />
          </SidebarSection>
        )}

        {/* Viewer */}
        {simulatedRole === 'viewer' && (
          <SidebarSection>
            {tierBadge('TIER 3 — Viewer Read-Only', 'purple')}
            <SidebarNavItem
              isActive={activeView === 'VIEWER_DASHBOARD'}
              onClick={() => handleNav('VIEWER_DASHBOARD')}
              icon={<LayoutDashboard size={18} />}
              label="Read-Only Metrics"
              labelSecondary="Dashboard metrics feed"
            />
            <SidebarNavItem
              isActive={activeView === 'VIEWER_PIPELINE'}
              onClick={() => handleNav('VIEWER_PIPELINE')}
              icon={<Kanban size={18} />}
              label="Pipeline Visibility"
              labelSecondary="Corporate deal maps"
            />
          </SidebarSection>
        )}

        {/* Settings */}
        <Box pt={2} mt={2} borderTopWidth={1} borderColor="whiteAlpha.200">
          <SidebarNavItem
            isActive={activeView === 'SETTINGS'}
            onClick={() => handleNav('SETTINGS')}
            icon={<Settings size={18} />}
            label="Settings & Labs"
            labelSecondary="Integrations & API keys"
          />
        </Box>

        {/* Theme Toggle */}
        <Box pt={4} mt={4} borderTopWidth={1} borderColor="whiteAlpha.200">
          <SidebarNavItem
            onClick={toggleColorMode}
            icon={colorMode === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            label="Appearance"
            labelSecondary={colorMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
          />
        </Box>
      </Box>

      {/* User Footer */}
      <Box p={4} borderTopWidth={1} borderColor="whiteAlpha.200">
        <Flex align="center" gap={3} p={2} rounded="2xl" bg="whiteAlpha.100">
          <Avatar size="sm" src={user?.photoURL} name={user?.displayName} />
          {(!collapsed || inDrawer) && (
            <>
              <Box flex={1}>
                <Text fontSize="10px" fontWeight="bold" noOfLines={1} color="whiteAlpha.900">
                  {user?.displayName}
                </Text>
                <Text fontSize="8px" textTransform="uppercase" letterSpacing="wider" color="whiteAlpha.500">
                  {profile?.role?.replace('_', ' ')}
                </Text>
              </Box>
              <IconButton
                aria-label="Logout"
                icon={<LogOut size={16} />}
                variant="ghost"
                size="xs"
                color="whiteAlpha.500"
                _hover={{color: 'red.400'}}
                onClick={onLogout}
              />
            </>
          )}
        </Flex>
      </Box>
    </VStack>
  );

  return (
    <Flex h="100vh" overflow="hidden">
      {/* Desktop Sidebar */}
      <Box
        display={{base: 'none', md: 'block'}}
        w={navWidth}
        h="100vh"
        borderRightWidth={1}
        borderColor="whiteAlpha.200"
        transition="width 0.3s"
        overflow="hidden"
        bg="gray.900"
      >
        <Sidebar variant={collapsed ? 'condensed' : 'default'}>
          {sidebarContent(false)}
        </Sidebar>
      </Box>

      {/* Mobile Drawer */}
      <Drawer placement="left" onClose={onMobileClose} isOpen={isMobileOpen}>
        <DrawerOverlay />
        <DrawerContent bg="gray.900">
          <DrawerBody p={0}>
            <Sidebar>
              {sidebarContent(true)}
            </Sidebar>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Main Content */}
      <Flex direction="column" flex={1} minW={0}>
        {/* Header */}
        <Flex
          as="header"
          h="80px"
          borderBottomWidth={1}
          borderColor="whiteAlpha.200"
          align="center"
          justify="space-between"
          px={{base: 4, md: 8}}
          bg="rgba(0,0,0,0.3)"
          backdropFilter="blur(12px)"
          position="sticky"
          top={0}
          zIndex={50}
        >
          <HStack spacing={3} minW={0}>
            <IconButton
              aria-label="Open menu"
              icon={<Menu size={20} />}
              variant="ghost"
              display={{md: 'none'}}
              onClick={onMobileOpen}
            />
            <Box display={{base: 'flex', md: 'none'}} alignItems="center" gap={2}>
              <Flex
                w={8} h={8}
                rounded="xl"
                bgGradient="linear(to-br, brand.500, brand.300)"
                align="center" justify="center"
              >
                <Zap size={18} color="white" fill="white" />
              </Flex>
              <Text fontWeight="extrabold" fontSize="sm" color="whiteAlpha.900">
                Zyntra AI
              </Text>
            </Box>
            <Text
              fontSize={{base: 'xs', md: 'sm'}}
              fontWeight="bold"
              textTransform="uppercase"
              letterSpacing={{base: '0.1em', md: '0.2em'}}
              color="whiteAlpha.600"
              noOfLines={1}
            >
              {activeView === 'OUTREACH' ? 'Outreach' : activeView === 'RESEARCH' ? 'Research' : activeView === 'ANALYTICS' ? 'Pipeline Health' : activeView === 'TEAM_ADMIN' ? 'Team' : activeView === 'SETTINGS' ? 'Settings' : 'Admin'}
            </Text>
          </HStack>

          <HStack spacing={3}>
            <Flex
              align="center"
              gap={1.5}
              p={1}
              bg="gray.900"
              borderWidth={1}
              borderColor="whiteAlpha.200"
              rounded="xl"
            >
              <Text
                display={{base: 'none', lg: 'inline'}}
                fontSize="9px"
                fontWeight="extrabold"
                textTransform="uppercase"
                letterSpacing="widest"
                color="whiteAlpha.500"
                px={2}
              >
                WORKSPACE ROLE:
              </Text>
              <Select
                value={simulatedRole}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                variant="unstyled"
                size="sm"
                fontSize="10px"
                fontWeight="bold"
                color="white"
                bg="whiteAlpha.100"
                borderWidth={1}
                borderColor="whiteAlpha.200"
                rounded="lg"
                px={2}
                py={1}
                minW="140px"
                cursor="pointer"
              >
                <option value="super_admin">⚡ [Tier 1] Super Admin</option>
                <option value="org_admin">🏢 [Tier 2] Org Admin (Settings)</option>
                <option value="sdr">🎯 [Tier 3] SDR Outbound Campaign</option>
                <option value="manager">🧑‍💼 [Tier 3] Manager Coach & Forecast</option>
                <option value="ae">💼 [Tier 3] Account Executive CRM</option>
                <option value="viewer">👁️ [Tier 3] Viewer Read-Only</option>
              </Select>
            </Flex>

            <Flex
              display={{base: 'none', md: 'flex'}}
              align="center"
              gap={2}
              px={3}
              py={1.5}
              rounded="xl"
              bg="whiteAlpha.100"
              borderWidth={1}
              borderColor="whiteAlpha.200"
            >
              <Box w={1.5} h={1.5} rounded="full" bg="green.400" animation="pulse 2s infinite" />
              <Text fontSize="9px" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="whiteAlpha.600">
                Online
              </Text>
            </Flex>
          </HStack>
        </Flex>

        {/* Page Content */}
        <Box flex={1} overflow="auto">
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}
