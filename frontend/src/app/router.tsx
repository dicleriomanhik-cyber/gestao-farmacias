import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import OperationalLayout from "../layouts/OperationalLayout";
import DashboardPage from "../pages/dashboard/DashboardPage";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage";
import ProtectedRoute from "../components/layout/ProtectedRoute";
import SaleListPage from "../pages/sales/SaleListPage";
import SaleDetailPage from "../pages/sales/SaleDetailPage";
import PosPage from "../pages/sales/PosPage";

import OperationalStockPage from "../pages/sales/OperationalStockPage";
import CashSessionPage from "../pages/sales/CashSessionPage";
import CashMovementsPage from "../pages/sales/CashMovementsPage";
import AdminCashPage from "../pages/sales/AdminCashPage";
import PurchaseListPage from "../pages/purchases/PurchaseListPage";
import PurchaseDetailPage from "../pages/purchases/PurchaseDetailPage";
import PurchaseFormPage from "../pages/purchases/PurchaseFormPage";
import StockProductListPage from "../pages/stock/StockProductListPage";
import ProductEditPage from "../pages/stock/ProductEditPage";
import StockBoxListPage from "../pages/stock/StockBoxListPage";
import StockBoxDetailPage from "../pages/stock/StockBoxDetailPage";
import StockLayout from "../layouts/StockLayout";
import StockBoxFormPage from "../pages/stock/StockBoxFormPage";
import StockMovementListPage from "../pages/stock/StockMovementListPage";
import StockReceiveFormPage from "../pages/stock/StockReceiveFormPage";
import StockAdjustFormPage from "../pages/stock/StockAdjustFormPage";
import StockCreateFormPage from "../pages/stock/StockCreateFormPage";
import ExpenseListPage from "../pages/expenses/ExpenseListPage";
import ExpenseFormPage from "../pages/expenses/ExpenseFormPage";
import ReportsPage from "../pages/reports/ReportsPage";
import SyncQueuePage from "../pages/sync/SyncQueuePage";
import CategoryListPage from "../pages/categories/CategoryListPage";
import CategoryFormPage from "../pages/categories/CategoryFormPage";
import SupplierListPage from "../pages/suppliers/SupplierListPage";
import SupplierFormPage from "../pages/suppliers/SupplierFormPage";
import SupplierProfilePage from "../pages/suppliers/SupplierProfilePage";
import PayablesPage from "../pages/suppliers/PayablesPage";
import SuppliersLayout from "../layouts/SuppliersLayout";
import UserListPage from "../pages/users/UserListPage";
import UserFormPage from "../pages/users/UserFormPage";
import PharmacyPage from "../pages/pharmacy/PharmacyPage";import SettingsPage from "../pages/settings/SettingsPage";
import ReturnListPage from "../pages/returns/ReturnListPage";
import ReturnFormPage from "../pages/returns/ReturnFormPage";
import ReturnDetailPage from "../pages/returns/ReturnDetailPage";
import OperationalReturnPage from "../pages/sales/OperationalReturnPage";
import OperationalReturnDetailPage from "../pages/sales/OperationalReturnDetailPage";


export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pos/login" element={<LoginPage variant="pos" />} />
        <Route path="/criar-conta" element={<RegisterPage />} />
        <Route path="/esqueci-password" element={<ForgotPasswordPage />} />
        <Route path="/redefinir-password" element={<ResetPasswordPage />} />
        
        {/* Rota Operacional (POS) */}
        <Route path="/pos" element={<ProtectedRoute requiredPermission="sales:create"><OperationalLayout /></ProtectedRoute>}>
          <Route index element={<PosPage />} />
          <Route path="historico" element={<SaleListPage hideNewSaleButton={true} isOperational={true} />} /><Route path="historico/:id" element={<SaleDetailPage isOperational={true} />} />
          <Route path="devolucoes" element={<OperationalReturnPage />} />
          <Route path="devolucoes/nova/:saleId" element={<OperationalReturnPage />} />
          <Route path="devolucoes/:id" element={<OperationalReturnDetailPage />} />
          <Route path="despesas" element={<ExpenseListPage isOperational={true} />} />
          <Route path="despesas/novo" element={<ExpenseFormPage isOperational={true} />} />
          <Route path="despesas/:id/editar" element={<ExpenseFormPage isOperational={true} />} />
          <Route path="stock" element={<OperationalStockPage />} /><Route path="caixa" element={<CashSessionPage />} />
          <Route path="movimentos" element={<CashMovementsPage />} />
          <Route path="sincronizacao" element={<SyncQueuePage />} />

        </Route>

        {/* Rotas Administrativas */}
        <Route path="/" element={<ProtectedRoute adminOnly><MainLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />

          <Route path="vendas" element={<ProtectedRoute requiredPermission="sales:read"><SaleListPage /></ProtectedRoute>} />
          <Route path="vendas/:id" element={<ProtectedRoute requiredPermission="sales:read"><SaleDetailPage /></ProtectedRoute>} />
          <Route path="vendas/novo" element={<ProtectedRoute requiredPermission="sales:create"><PosPage /></ProtectedRoute>} />
          <Route path="caixa" element={<ProtectedRoute requiredPermission="cash:open"><CashSessionPage /></ProtectedRoute>} />
          <Route path="caixa-admin" element={<ProtectedRoute requiredPermission="cash:open"><AdminCashPage /></ProtectedRoute>} />

          <Route path="compras" element={<Navigate to="/fornecedores/compras" replace />} />
          <Route path="compras/:id" element={<Navigate to="/fornecedores/compras" replace />} />
          <Route path="compras/novo" element={<Navigate to="/fornecedores/compras/nova" replace />} />

          <Route path="produtos/*" element={<Navigate to="/stock/produtos" replace />} />
          
          

          <Route element={<StockLayout />}>
          <Route path="stock/caixas" element={<ProtectedRoute requiredPermission="stock:read"><StockBoxListPage /></ProtectedRoute>} />
          <Route path="stock/caixas/nova" element={<ProtectedRoute requiredPermission="stock:write"><StockBoxFormPage /></ProtectedRoute>} />
          <Route path="stock/caixas/:id" element={<ProtectedRoute requiredPermission="stock:read"><StockBoxDetailPage /></ProtectedRoute>} />
          <Route path="stock/produtos" element={<ProtectedRoute requiredPermission="products:read"><StockProductListPage /></ProtectedRoute>} />
          <Route path="stock/produtos/:productId/editar" element={<ProtectedRoute requiredPermission="products:write"><ProductEditPage /></ProtectedRoute>} />
          </Route>
          <Route path="stock/lotes" element={<Navigate to="/stock/caixas/nova" replace />} />
          <Route path="stock/movimentos" element={<ProtectedRoute requiredPermission="stock:read"><StockMovementListPage /></ProtectedRoute>} />
          <Route path="stock/receber" element={<ProtectedRoute requiredPermission="stock:write"><StockReceiveFormPage /></ProtectedRoute>} />
          <Route path="stock/novo" element={<ProtectedRoute requiredPermission="stock:write"><StockCreateFormPage /></ProtectedRoute>} />
          <Route path="stock/ajustar" element={<ProtectedRoute requiredPermission="stock:adjust"><StockAdjustFormPage /></ProtectedRoute>} />

          <Route path="despesas" element={<ProtectedRoute requiredPermission="expenses:read"><ExpenseListPage /></ProtectedRoute>} />
          <Route path="despesas/novo" element={<ProtectedRoute requiredPermission="expenses:create"><ExpenseFormPage /></ProtectedRoute>} />
          <Route path="despesas/:id/editar" element={<ProtectedRoute requiredPermission="expenses:create"><ExpenseFormPage /></ProtectedRoute>} />
          <Route path="relatorios" element={<ProtectedRoute requiredPermission="reports:read"><ReportsPage /></ProtectedRoute>} />
          <Route path="sincronizacao" element={<ProtectedRoute><SyncQueuePage /></ProtectedRoute>} />

          <Route path="categorias" element={<ProtectedRoute requiredPermission="products:read"><CategoryListPage /></ProtectedRoute>} />
          <Route path="categorias/novo" element={<ProtectedRoute requiredPermission="products:write"><CategoryFormPage /></ProtectedRoute>} />
          <Route path="categorias/:id/editar" element={<ProtectedRoute requiredPermission="products:write"><CategoryFormPage /></ProtectedRoute>} />

          <Route element={<SuppliersLayout />}>
          <Route path="fornecedores" element={<ProtectedRoute requiredPermission="pharmacy:config:write"><SupplierListPage /></ProtectedRoute>} />
          <Route path="fornecedores/novo" element={<ProtectedRoute requiredPermission="pharmacy:config:write"><SupplierFormPage /></ProtectedRoute>} />
          <Route path="fornecedores/:id/editar" element={<ProtectedRoute requiredPermission="pharmacy:config:write"><SupplierFormPage /></ProtectedRoute>} />
          <Route path="fornecedores/compras" element={<ProtectedRoute requiredPermission="pharmacy:config:write"><PurchaseListPage /></ProtectedRoute>} />
          <Route path="fornecedores/compras/nova" element={<ProtectedRoute requiredPermission="pharmacy:config:write"><PurchaseFormPage /></ProtectedRoute>} />
          <Route path="fornecedores/compras/:purchaseId" element={<ProtectedRoute requiredPermission="pharmacy:config:write"><PurchaseDetailPage /></ProtectedRoute>} />
          <Route path="fornecedores/contas-a-pagar" element={<ProtectedRoute requiredPermission="pharmacy:config:write"><PayablesPage /></ProtectedRoute>} />
          <Route path="fornecedores/:id" element={<ProtectedRoute requiredPermission="pharmacy:config:write"><SupplierProfilePage /></ProtectedRoute>} />
          </Route>

          <Route path="utilizadores" element={<ProtectedRoute requiredPermission="users:read"><UserListPage /></ProtectedRoute>} />
          <Route path="utilizadores/novo" element={<ProtectedRoute requiredPermission="users:write"><UserFormPage /></ProtectedRoute>} />
          <Route path="utilizadores/:id/editar" element={<ProtectedRoute requiredPermission="users:write"><UserFormPage /></ProtectedRoute>} />

          <Route path="devolucoes" element={<ProtectedRoute requiredPermission="returns:read"><ReturnListPage /></ProtectedRoute>} />
          <Route path="devolucoes/nova" element={<ProtectedRoute requiredPermission="returns:create"><ReturnFormPage /></ProtectedRoute>} />
          <Route path="devolucoes/nova/:saleId" element={<ProtectedRoute requiredPermission="returns:create"><ReturnFormPage /></ProtectedRoute>} />
          <Route path="devolucoes/:id" element={<ProtectedRoute requiredPermission="returns:read"><ReturnDetailPage /></ProtectedRoute>} />
          <Route path="farmacia" element={<ProtectedRoute requiredPermission="pharmacy:config:read"><PharmacyPage /></ProtectedRoute>} /><Route path="definicoes" element={<ProtectedRoute requiredPermission="pharmacy:config:write"><SettingsPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}






