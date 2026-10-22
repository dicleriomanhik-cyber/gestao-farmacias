import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import DashboardPage from "../pages/dashboard/DashboardPage";
import LoginPage from "../pages/auth/LoginPage";
import ProtectedRoute from "../components/layout/ProtectedRoute";
import SaleListPage from "../pages/sales/SaleListPage";
import SaleDetailPage from "../pages/sales/SaleDetailPage";
import PosPage from "../pages/sales/PosPage";
import CashSessionPage from "../pages/sales/CashSessionPage";
import PurchaseListPage from "../pages/purchases/PurchaseListPage";
import PurchaseDetailPage from "../pages/purchases/PurchaseDetailPage";
import PurchaseFormPage from "../pages/purchases/PurchaseFormPage";
import ProductListPage from "../pages/products/ProductListPage";
import ProductFormPage from "../pages/products/ProductFormPage";
import StockLotListPage from "../pages/stock/StockLotListPage";
import StockMovementListPage from "../pages/stock/StockMovementListPage";
import StockReceiveFormPage from "../pages/stock/StockReceiveFormPage";
import StockAdjustFormPage from "../pages/stock/StockAdjustFormPage";
import ExpenseListPage from "../pages/expenses/ExpenseListPage";
import ExpenseFormPage from "../pages/expenses/ExpenseFormPage";
import ReportsPage from "../pages/reports/ReportsPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />

          <Route path="vendas" element={<ProtectedRoute requiredPermission="sales:read"><SaleListPage /></ProtectedRoute>} />
          <Route path="vendas/:id" element={<ProtectedRoute requiredPermission="sales:read"><SaleDetailPage /></ProtectedRoute>} />
          <Route path="vendas/novo" element={<ProtectedRoute requiredPermission="sales:create"><PosPage /></ProtectedRoute>} />
          <Route path="caixa" element={<ProtectedRoute requiredPermission="cash:open"><CashSessionPage /></ProtectedRoute>} />

          <Route path="compras" element={<ProtectedRoute requiredPermission="purchases:read"><PurchaseListPage /></ProtectedRoute>} />
          <Route path="compras/:id" element={<ProtectedRoute requiredPermission="purchases:read"><PurchaseDetailPage /></ProtectedRoute>} />
          <Route path="compras/novo" element={<ProtectedRoute requiredPermission="purchases:write"><PurchaseFormPage /></ProtectedRoute>} />

          <Route path="produtos" element={<ProtectedRoute requiredPermission="products:read"><ProductListPage /></ProtectedRoute>} />
          <Route path="produtos/novo" element={<ProtectedRoute requiredPermission="products:write"><ProductFormPage /></ProtectedRoute>} />
          <Route path="produtos/:id/editar" element={<ProtectedRoute requiredPermission="products:write"><ProductFormPage /></ProtectedRoute>} />

          <Route path="stock/lotes" element={<ProtectedRoute requiredPermission="stock:read"><StockLotListPage /></ProtectedRoute>} />
          <Route path="stock/movimentos" element={<ProtectedRoute requiredPermission="stock:read"><StockMovementListPage /></ProtectedRoute>} />
          <Route path="stock/receber" element={<ProtectedRoute requiredPermission="stock:write"><StockReceiveFormPage /></ProtectedRoute>} />
          <Route path="stock/ajustar" element={<ProtectedRoute requiredPermission="stock:adjust"><StockAdjustFormPage /></ProtectedRoute>} />

          <Route path="despesas" element={<ProtectedRoute requiredPermission="expenses:read"><ExpenseListPage /></ProtectedRoute>} />
          <Route path="despesas/novo" element={<ProtectedRoute requiredPermission="expenses:create"><ExpenseFormPage /></ProtectedRoute>} />
          <Route path="despesas/:id/editar" element={<ProtectedRoute requiredPermission="expenses:create"><ExpenseFormPage /></ProtectedRoute>} />
          <Route path="relatorios" element={<ProtectedRoute requiredPermission="reports:read"><ReportsPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
