// Clase para manejar los gastos
class DebtManager {
    constructor() {
        // Inicializar el array de deudas
        this.debts = [];
        
        // Obtener referencias a los elementos del DOM
        this.form = document.getElementById('debtForm');
        this.amountInput = document.getElementById('amount');
        this.descriptionInput = document.getElementById('description');
        this.dueDateInput = document.getElementById('dueDate');
        this.addDebtBtn = document.getElementById('addDebt');
        this.deleteAllBtn = document.getElementById('deleteAll');
        this.duplicateMonthBtn = document.getElementById('duplicateMonth');
        this.sortDateBtn = document.getElementById('sortDate');
        this.sortDirection = 'asc';
        this.currentFilter = 'all';

        // Verificar que los elementos esenciales existan
        if (!this.form || !this.amountInput || !this.descriptionInput || !this.dueDateInput || !this.addDebtBtn) {
            console.error('No se encontraron elementos esenciales del formulario:', {
                form: !!this.form,
                amountInput: !!this.amountInput,
                descriptionInput: !!this.descriptionInput,
                dueDateInput: !!this.dueDateInput,
                addDebtBtn: !!this.addDebtBtn
            });
            return;
        }

        this.init();
    }

    init() {
        this.loadDebts();
        this.initEventListeners();
        this.updateDebtsList();
        this.updateTotals();
        this.checkUpcomingDebts();
        this.checkOverdueDebts();
    }

    initEventListeners() {
        try {
            // Event listener para el formulario
            if (this.form) {
                this.form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.addDebt();
                });
            }

            // Event listener para el botón de eliminar todo
            if (this.deleteAllBtn) {
                this.deleteAllBtn.addEventListener('click', () => {
                    if (confirm('¿Estás seguro de que deseas eliminar todos los gastos?')) {
                        this.deleteAllDebts();
                    }
                });
            }

            // Event listener para el botón de duplicar mes
            if (this.duplicateMonthBtn) {
                this.duplicateMonthBtn.addEventListener('click', () => {
                    this.duplicateLastMonthEntries();
                });
            }

            // Event listener para el botón de ordenar por fecha
            if (this.sortDateBtn) {
                this.sortDateBtn.addEventListener('click', () => {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                    this.sortDateBtn.innerHTML = this.sortDirection === 'desc' ? 
                        '<i class="bi bi-sort-down"></i>' : 
                        '<i class="bi bi-sort-up"></i>';
                    this.updateDebtsList();
                });
            }

            // Agregar event listeners para los botones de filtro
            const filterButtons = {
                'filterAll': 'all',
                'filterPending': 'pending',
                'filterPaid': 'paid',
                'filterOverdue': 'overdue'
            };

            Object.entries(filterButtons).forEach(([buttonId, filterValue]) => {
                const button = document.getElementById(buttonId);
                if (button) {
                    button.addEventListener('click', () => {
                        this.currentFilter = filterValue;
                        this.updateDebtsList();
                        
                        // Actualizar clases activas de los botones
                        Object.keys(filterButtons).forEach(id => {
                            const btn = document.getElementById(id);
                            if (btn) {
                                btn.classList.remove('active');
                            }
                        });
                        button.classList.add('active');
                    });
                }
            });
        } catch (error) {
            console.error('Error al inicializar los event listeners:', error);
            this.showNotification('Error al inicializar los controles: ' + error.message, 'error');
        }
    }

    addDebt() {
        try {
            const amount = parseFloat(this.amountInput.value);
            const description = this.descriptionInput.value.trim();
            const dueDate = this.dueDateInput.value;
            const statusSelect = document.getElementById('status');
            const status = statusSelect ? statusSelect.value : 'pending';

            if (!amount || !description || !dueDate) {
                this.showNotification('Por favor completa todos los campos', 'error');
                return;
            }

            // Verificar si estamos en modo edición
            const editId = this.addDebtBtn.dataset.editId;
            if (editId) {
                // Modo edición
                const debtIndex = this.debts.findIndex(d => d.id === parseInt(editId));
                if (debtIndex === -1) {
                    this.showNotification('No se encontró el gasto a editar', 'error');
                    return;
                }

                // Actualizar el gasto existente
                this.debts[debtIndex] = {
                    ...this.debts[debtIndex],
                    amount,
                    description,
                    dueDate,
                    status,
                    updatedAt: new Date().toISOString()
                };

                // Restaurar el botón a su estado original
                this.addDebtBtn.textContent = 'Agregar Gasto';
                this.addDebtBtn.classList.remove('btn-warning');
                this.addDebtBtn.classList.add('btn-primary');
                delete this.addDebtBtn.dataset.editId;

                this.showNotification('Gasto actualizado exitosamente', 'success');
            } else {
                // Modo agregar
                const debt = {
                    id: Date.now(),
                    amount,
                    description,
                    dueDate,
                    status,
                    createdAt: new Date().toISOString()
                };

                this.debts.push(debt);
                this.showNotification('Gasto agregado exitosamente', 'success');
            }

            // Guardar y actualizar la interfaz
            this.saveDebts();
            this.updateDebtsList();
            this.updateTotals();
            this.checkUpcomingDebts();
            this.checkOverdueDebts();
            this.form.reset();
        } catch (error) {
            console.error('Error al procesar el gasto:', error);
            this.showNotification('Error al procesar el gasto: ' + error.message, 'error');
        }
    }

    updateDebtsList() {
        try {
            const debtsList = document.getElementById('debtsList');
            if (!debtsList) return;

            // Filtrar las deudas según el filtro actual
            let filteredDebts = [...this.debts];
            if (this.currentFilter !== 'all') {
                filteredDebts = filteredDebts.filter(debt => debt.status === this.currentFilter);
            }

            // Ordenar las deudas por fecha
            const sortedDebts = filteredDebts.sort((a, b) => {
                const dateA = new Date(a.dueDate);
                const dateB = new Date(b.dueDate);
                return this.sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
            });

            if (sortedDebts.length === 0) {
                debtsList.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted py-4">
                            <i class="fas fa-clipboard-list fa-2x mb-2"></i>
                            <p class="mb-0">No hay gastos ${this.currentFilter !== 'all' ? 'en este estado' : 'registrados'}</p>
                        </td>
                    </tr>
                `;
                return;
            }

            debtsList.innerHTML = sortedDebts.map(debt => {
                const dueDate = new Date(debt.dueDate);
                const formattedDate = dueDate.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                const formattedAmount = `$${debt.amount}`;

                let statusClass = '';
                let statusText = '';
                let badgeClass = '';
                switch (debt.status) {
                    case 'paid':
                        statusClass = 'paid-expense';
                        statusText = 'Pagado';
                        badgeClass = 'bg-success';
                        break;
                    case 'pending':
                        statusClass = 'pending-expense';
                        statusText = 'Pendiente';
                        badgeClass = 'bg-warning';
                        break;
                    case 'overdue':
                        statusClass = 'overdue-expense';
                        statusText = 'Vencido';
                        badgeClass = 'bg-danger';
                        break;
                    default:
                        statusClass = 'pending-expense';
                        statusText = 'Pendiente';
                        badgeClass = 'bg-warning';
                }

                return `
                    <tr class="${statusClass}">
                        <td>${debt.description}</td>
                        <td class="text-end">${formattedAmount}</td>
                        <td>${formattedDate}</td>
                        <td>
                            <div class="btn-group">
                                <button class="btn btn-sm btn-action btn-outline-success" onclick="debtManager.updateStatus(${debt.id}, 'paid')" title="Marcar como pagado">
                                    <i class="bi bi-check-circle-fill text-success"></i>
                                </button>
                            </div>
                        </td>
                        <td>
                            <div class="btn-group">
                                <button class="btn btn-sm btn-action border-primary" onclick="debtManager.editDebt(${debt.id})" title="Editar">
                                    <i class="bi bi-pencil-fill text-primary"></i>
                                </button>
                                <button class="btn btn-sm btn-action btn-outline-danger" onclick="debtManager.deleteDebt(${debt.id})" title="Eliminar">
                                    <i class="bi bi-trash-fill text-danger"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Error al actualizar la lista de gastos:', error);
            this.showNotification('Error al actualizar la lista: ' + error.message, 'error');
        }
    }

    updateStatus(id, status) {
        try {
            const debtIndex = this.debts.findIndex(d => d.id === id);
            if (debtIndex === -1) {
                this.showNotification('No se encontró el gasto a actualizar', 'error');
                return;
            }

            // Actualizar el estado del gasto
            this.debts[debtIndex].status = status;
            this.debts[debtIndex].updatedAt = new Date().toISOString();

            // Guardar los cambios
            this.saveDebts();

            // Actualizar la interfaz
            this.updateDebtsList();
            this.updateTotals();
            this.checkUpcomingDebts();
            this.checkOverdueDebts();

            // Mostrar notificación
            const statusText = status === 'paid' ? 'pagado' : 'pendiente';
            this.showNotification(`Gasto marcado como ${statusText} exitosamente`, 'success');
        } catch (error) {
            console.error('Error al actualizar el estado:', error);
            this.showNotification('Error al actualizar el estado: ' + error.message, 'error');
        }
    }

    editDebt(id) {
        try {
            const debt = this.debts.find(d => d.id === id);
            if (!debt) {
                this.showNotification('No se encontró el gasto a editar', 'error');
                return;
            }

            // Verificar que los elementos del formulario existan
            if (!this.amountInput || !this.descriptionInput || !this.dueDateInput || !this.addDebtBtn) {
                console.error('Elementos del formulario no encontrados:', {
                    amountInput: !!this.amountInput,
                    descriptionInput: !!this.descriptionInput,
                    dueDateInput: !!this.dueDateInput,
                    addDebtBtn: !!this.addDebtBtn
                });
                this.showNotification('Error: No se encontraron los elementos del formulario', 'error');
                return;
            }

            // Llenar el formulario con los datos del gasto
            this.amountInput.value = debt.amount;
            this.descriptionInput.value = debt.description;
            this.dueDateInput.value = debt.dueDate.split('T')[0];

            // Actualizar el botón de agregar
            this.addDebtBtn.textContent = 'Actualizar';
            this.addDebtBtn.dataset.editId = id;
            this.addDebtBtn.classList.remove('btn-primary');
            this.addDebtBtn.classList.add('btn-warning');

            // Hacer scroll al formulario
            this.form.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Error al editar el gasto:', error);
            this.showNotification('Error al editar el gasto: ' + error.message, 'error');
        }
    }

    deleteDebt(id) {
        try {
            if (!confirm('¿Estás seguro de que deseas eliminar este gasto?')) {
                return;
            }

            const debtIndex = this.debts.findIndex(debt => debt.id === id);
            if (debtIndex === -1) {
                this.showNotification('No se encontró el gasto a eliminar', 'error');
                return;
            }

            this.debts.splice(debtIndex, 1);
            this.saveDebts();
            this.updateDebtsList();
            this.updateTotals();
            this.checkUpcomingDebts();
            this.checkOverdueDebts();
            this.showNotification('Gasto eliminado exitosamente', 'success');
        } catch (error) {
            console.error('Error al eliminar el gasto:', error);
            this.showNotification('Error al eliminar el gasto: ' + error.message, 'error');
        }
    }

    deleteAllDebts() {
        try {
            this.debts = [];
            this.saveDebts();
            this.updateDebtsList();
            this.updateTotals();
            this.checkUpcomingDebts();
            this.checkOverdueDebts();
            this.showNotification('Todos los gastos han sido eliminados', 'success');
        } catch (error) {
            console.error('Error al eliminar todos los gastos:', error);
            this.showNotification('Error al eliminar todos los gastos: ' + error.message, 'error');
        }
    }

    duplicateLastMonthEntries() {
        try {
            const currentDate = new Date();
            const nextMonth = new Date(currentDate);
            nextMonth.setMonth(currentDate.getMonth() + 1);

            const monthNames = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ];
            const nextMonthName = monthNames[nextMonth.getMonth()];
            const nextMonthYear = nextMonth.getFullYear();

            const currentMonthEntries = this.debts.filter(debt => {
                const debtDate = new Date(debt.dueDate);
                return debtDate.getMonth() === currentDate.getMonth() && 
                       debtDate.getFullYear() === currentDate.getFullYear();
            });

            if (currentMonthEntries.length === 0) {
                this.showNotification('No hay entradas en el mes actual para duplicar', 'warning');
                return;
            }

            const newEntries = currentMonthEntries.map(debt => {
                const newDate = new Date(debt.dueDate);
                newDate.setMonth(nextMonth.getMonth());
                newDate.setFullYear(nextMonth.getFullYear());

                return {
                    ...debt,
                    id: Date.now() + Math.random(),
                    dueDate: newDate.toISOString(),
                    status: 'pending'
                };
            });

            this.debts.push(...newEntries);
            this.saveDebts();
            this.updateDebtsList();
            this.updateTotals();
            this.checkUpcomingDebts();
            this.checkOverdueDebts();

            this.showNotification(`Se han duplicado ${newEntries.length} entradas para ${nextMonthName} ${nextMonthYear}`, 'success');
        } catch (error) {
            console.error('Error al duplicar las entradas:', error);
            this.showNotification('Error al duplicar las entradas: ' + error.message, 'error');
        }
    }

    saveDebts() {
        try {
            localStorage.setItem('debts', JSON.stringify(this.debts));
        } catch (error) {
            console.error('Error al guardar los gastos:', error);
            this.showNotification('Error al guardar los gastos: ' + error.message, 'error');
        }
    }

    loadDebts() {
        try {
            const savedDebts = localStorage.getItem('debts');
            if (savedDebts) {
                this.debts = JSON.parse(savedDebts);
            }
        } catch (error) {
            console.error('Error al cargar los gastos:', error);
            this.showNotification('Error al cargar los gastos: ' + error.message, 'error');
        }
    }

    updateTotals() {
        try {
            // Calcular los totales
            const totalAmount = this.debts.reduce((sum, debt) => sum + parseFloat(debt.amount), 0);
            const paidAmount = this.debts
                .filter(debt => debt.status === 'paid')
                .reduce((sum, debt) => sum + parseFloat(debt.amount), 0);
            const pendingAmount = this.debts
                .filter(debt => debt.status === 'pending')
                .reduce((sum, debt) => sum + parseFloat(debt.amount), 0);
            const overdueAmount = this.debts
                .filter(debt => debt.status === 'overdue')
                .reduce((sum, debt) => sum + parseFloat(debt.amount), 0);

            // Obtener los elementos del DOM
            const totalAmountElement = document.getElementById('totalAmount');
            const paidAmountElement = document.getElementById('totalPaid');
            const pendingAmountElement = document.getElementById('totalPending');
            const overdueAmountElement = document.getElementById('totalOverdue');

            // Verificar que los elementos existan antes de actualizarlos
            if (totalAmountElement) {
                totalAmountElement.textContent = `$${Math.round(totalAmount)}`;
            }
            if (paidAmountElement) {
                paidAmountElement.textContent = `$${Math.round(paidAmount)}`;
            }
            if (pendingAmountElement) {
                pendingAmountElement.textContent = `$${Math.round(pendingAmount)}`;
            }
            if (overdueAmountElement) {
                overdueAmountElement.textContent = `$${Math.round(overdueAmount)}`;
            }

            // Actualizar el título de la página con el total pendiente
            document.title = `Control de Gastos - Pendiente: $${Math.round(pendingAmount)}`;

            // Log para depuración
            console.log('Totales actualizados:', {
                total: Math.round(totalAmount),
                paid: Math.round(paidAmount),
                pending: Math.round(pendingAmount),
                overdue: Math.round(overdueAmount),
                elements: {
                    total: !!totalAmountElement,
                    paid: !!paidAmountElement,
                    pending: !!pendingAmountElement,
                    overdue: !!overdueAmountElement
                }
            });
        } catch (error) {
            console.error('Error al actualizar los totales:', error);
            this.showNotification('Error al actualizar los totales: ' + error.message, 'error');
        }
    }

    checkUpcomingDebts() {
        try {
            const today = new Date();
            const threeDaysFromNow = new Date(today);
            threeDaysFromNow.setDate(today.getDate() + 3);

            const upcomingDebts = this.debts.filter(debt => {
                const dueDate = new Date(debt.dueDate);
                return debt.status === 'pending' && dueDate > today && dueDate <= threeDaysFromNow;
            });

            const upcomingDebtsList = document.getElementById('upcomingDebtsList');
            if (upcomingDebtsList) {
                if (upcomingDebts.length === 0) {
                    upcomingDebtsList.innerHTML = `
                        <div class="text-center text-muted py-3">
                            <i class="fas fa-check-circle fa-2x mb-2"></i>
                            <p class="mb-0">No hay gastos próximos</p>
                        </div>
                    `;
                } else {
                    upcomingDebtsList.innerHTML = upcomingDebts.map(debt => {
                        const dueDate = new Date(debt.dueDate);
                        const formattedDate = dueDate.toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        });
                        return `
                            <div class="upcoming-debt-item">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-1">${debt.description}</h6>
                                        <p class="mb-0 text-muted">Vence: ${formattedDate}</p>
                                    </div>
                                    <div class="text-end">
                                        <h6 class="mb-1">$${debt.amount}</h6>
                                        <button class="btn btn-sm btn-success" onclick="debtManager.updateStatus(${debt.id}, 'paid')">
                                            <i class="bi bi-check-circle-fill"></i> Pagar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                }
            }
        } catch (error) {
            console.error('Error al verificar gastos próximos:', error);
            this.showNotification('Error al verificar gastos próximos: ' + error.message, 'error');
        }
    }

    checkOverdueDebts() {
        try {
            const today = new Date();
            const overdueDebts = this.debts.filter(debt => {
                const dueDate = new Date(debt.dueDate);
                return debt.status === 'pending' && dueDate < today;
            });

            const overdueDebtsList = document.getElementById('overdueDebtsList');
            if (overdueDebtsList) {
                if (overdueDebts.length === 0) {
                    overdueDebtsList.innerHTML = `
                        <div class="text-center text-muted py-3">
                            <i class="fas fa-check-circle fa-2x mb-2"></i>
                            <p class="mb-0">No hay gastos vencidos</p>
                        </div>
                    `;
                } else {
                    overdueDebtsList.innerHTML = overdueDebts.map(debt => {
                        const dueDate = new Date(debt.dueDate);
                        const formattedDate = dueDate.toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        });
                        return `
                            <div class="overdue-debt-item">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-1">${debt.description}</h6>
                                        <p class="mb-0 text-muted">Vencido: ${formattedDate}</p>
                                    </div>
                                    <div class="text-end">
                                        <h6 class="mb-1">$${debt.amount}</h6>
                                        <button class="btn btn-sm btn-success" onclick="debtManager.updateStatus(${debt.id}, 'paid')">
                                            <i class="bi bi-check-circle-fill"></i> Pagar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                }
            }
        } catch (error) {
            console.error('Error al verificar gastos vencidos:', error);
            this.showNotification('Error al verificar gastos vencidos: ' + error.message, 'error');
        }
    }

    showNotification(message, type = 'info') {
        try {
            const notification = document.createElement('div');
            notification.className = `alert alert-${type} notification`;
            notification.textContent = message;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 3000);
        } catch (error) {
            console.error('Error al mostrar la notificación:', error);
        }
    }
}

// Inicializar el gestor de gastos
const debtManager = new DebtManager();