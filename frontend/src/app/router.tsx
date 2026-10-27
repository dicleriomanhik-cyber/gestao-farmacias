import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import OperationalLayout from "../layouts/OperationalLayout";
import DashboardPage from "../pages/dashboard/DashboardPage";
import LoginPage from "../pages/auth/LoginPage";
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
import ProductListPage from "../pages/products/ProductListPage";
import ProductFormPage from "../pages/products/ProductFormPage";
import StockLotListPage from "../pages/stock/StockLotListPage";
import StockMovementListPage from "../pages/stock/StockMovementListPage";
import StockReceiveFormPage from "../pages/stock/StockReceiveFormPage";
import StockAdjustFormPage from "../pages/stock/StockAdjustFormPage";
import StockCreateFormPage from "../pages/stock/StockCreateFormPage";
import ExpenseListPage from "../pages/expenses/ExpenseListPage";
import ExpenseFormPage from "../pages/expenses/ExpenseFormPage";
import ReportsPage from "../pages/reports/ReportsPage";
import CategoryListPage from "../pages/categories/CategoryListPage";
import CategoryFormPage from "../pages/categories/CategoryFormPage";
import SupplierListPage from "../pages/suppliers/SupplierListPage";
import SupplierFormPage from "../pages/suppliers/SupplierFormPage";
import UserListPage from "../pages/users/UserListPage";
import UserFormPage from "../pages/users/UserFormPage";
import PharmacyPage from "../pages/pharmacy/PharmacyPage";
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
        
        {/* Rota Operacional (POS) */}
        <Route path="/pos" element={<ProtectedRoute requiredPermission="sales:create"><OperationalLayout /></ProtectedRoute>}>
          <Route index element={<PosPage />} />
          <Route path="historico" element={<SaleListPage hideNewSaleButton={true} isOperational={true} />} /><Route path="historico/:id" element={<SaleDetailPage isOperational={true} />} />
          <Route path="devolucoes" element={<OperationalReturnPage />} />
          <Route path="devolucoes/nova/:saleId" element={<OperationalReturnPage />} />
          <Route path="devolucoes/:id" element={<OperationalReturnDetailPage />} />
          <Route path="despesas" element={<ExpenseListPage isOperational={true} />} />
          <Route path="despesas/novo" element={<ExpenseFormPage isOperational={true} />} />
          <Route path="stock" element={<OperationalStockPage />} /><Route path="caixa" element={<CashSessionPage />} />`r`n          <Route path="movimentos" element={<CashMovementsPage />} />

        </Route>

        {/* Rotas Administrativas */}
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />

          <Route path="vendas" element={<ProtectedRoute requiredPermission="sales:read"><SaleListPage /></ProtectedRoute>} />
          <Route path="vendas/:id" element={<ProtectedRoute requiredPermission="sales:read"><SaleDetailPage /></ProtectedRoute>} />
          <Route path="vendas/novo" element={<ProtectedRoute requiredPermission="sales:create"><PosPage /></ProtectedRoute>} />
          <Route path="caixa" element={<ProtectedRoute requiredPermission="cash:open"><CashSessionPage /></ProtectedRoute>} />
          <Route path="caixa-admin" element={<ProtectedRoute requiredPermission="cash:open"><AdminCashPage /></ProtectedRoute>} />

          <Route path="compras" element={<ProtectedRoute requiredPermission="purchases:read"><PurchaseListPage /></ProtectedRoute>} />
          <Route path="compras/:id" element={<ProtectedRoute requiredPermission="purchases:read"><PurchaseDetailPage /></ProtectedRoute>} />
          <Route path="compras/novo" element={<ProtectedRoute requiredPermission="purchases:write"><PurchaseFormPage /></ProtectedRoute>} />

          <Route path="produtos" element={<ProtectedRoute requiredPermission="products:read"><ProductListPage /></ProtectedRoute>} />
          <Route path="produtos/novo" element={<ProtectedRoute requiredPermission="products:write"><ProductFormPage /></ProtectedRoute>} />
          <Route path="produtos/:id/editar" element={<ProtectedRoute requiredPermission="products:write"><ProductFormPage /></ProtectedRoute>} />

          <Route path="stock/lotes" element={<ProtectedRoute requiredPermission="stock:read"><StockLotListPage /></ProtectedRoute>} />
          <Route path="stock/movimentos" element={<ProtectedRoute requiredPermission="stock:read"><StockMovementListPage /></ProtectedRoute>} />
          <Route path="stock/receber" element={<ProtectedRoute requiredPermission="stock:write"><StockReceiveFormPage /></ProtectedRoute>} />
          <Route path="stock/novo" element={<ProtectedRoute requiredPermission="stock:write"><StockCreateFormPage /></ProtectedRoute>} />
          <Route path="stock/ajustar" element={<ProtectedRoute requiredPermission="stock:adjust"><StockAdjustFormPage /></ProtectedRoute>} />

          <Route path="despesas" element={<ProtectedRoute requiredPermission="expenses:read"><ExpenseListPage /></ProtectedRoute>} />
          <Route path="despesas/novo" element={<ProtectedRoute requiredPermission="expenses:create"><ExpenseFormPage /></ProtectedRoute>} />
          <Route path="despesas/:id/editar" element={<ProtectedRoute requiredPermission="expenses:create"><ExpenseFormPage /></ProtectedRoute>} />
          <Route path="relatorios" element={<ProtectedRoute requiredPermission="reports:read"><ReportsPage /></ProtectedRoute>} />

          <Route path="categorias" element={<ProtectedRoute requiredPermission="products:read"><CategoryListPage /></ProtectedRoute>} />
          <Route path="categorias/novo" element={<ProtectedRoute requiredPermission="products:write"><CategoryFormPage /></ProtectedRoute>} />
          <Route path="categorias/:id/editar" element={<ProtectedRoute requiredPermission="products:write"><CategoryFormPage /></ProtectedRoute>} />

          <Route path="fornecedores" element={<ProtectedRoute requiredPermission="suppliers:read"><SupplierListPage /></ProtectedRoute>} />
          <Route path="fornecedores/novo" element={<ProtectedRoute requiredPermission="suppliers:write"><SupplierFormPage /></ProtectedRoute>} />
          <Route path="fornecedores/:id/editar" element={<ProtectedRoute requiredPermission="suppliers:write"><SupplierFormPage /></ProtectedRoute>} />

          <Route path="utilizadores" element={<ProtectedRoute requiredPermission="users:read"><UserListPage /></ProtectedRoute>} />
          <Route path="utilizadores/novo" element={<ProtectedRoute requiredPermission="users:write"><UserFormPage /></ProtectedRoute>} />
          <Route path="utilizadores/:id/editar" element={<ProtectedRoute requiredPermission="users:write"><UserFormPage /></ProtectedRoute>} />

          <Route path="devolucoes" element={<ProtectedRoute requiredPermission="returns:read"><ReturnListPage /></ProtectedRoute>} />
          <Route path="devolucoes/nova" element={<ProtectedRoute requiredPermission="returns:create"><ReturnFormPage /></ProtectedRoute>} />
          <Route path="devolucoes/nova/:saleId" element={<ProtectedRoute requiredPermission="returns:create"><ReturnFormPage /></ProtectedRoute>} />
          <Route path="devolucoes/:id" element={<ProtectedRoute requiredPermission="returns:read"><ReturnDetailPage /></ProtectedRoute>} />
          <Route path="farmacia" element={<ProtectedRoute requiredPermission="pharmacy:config:read"><PharmacyPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}




