export const DICTIONARY = {
  common: {
    loading: "Загрузка...",
    error: "Ошибка",
    save: "Сохранить",
    cancel: "Отмена",
    delete: "Удалить",
    create: "Создать",
    edit: "Редактировать",
    back: "Назад",
    success: "Успешно",
  },
  status: {
    todo: "К выполнению",
    in_progress: "В работе",
    done: "Готово",
    active: "Активен",
    development: "Разработка",
    insurance: "Страхование",
    analytics: "Аналитика",
    operations: "Операции",
    archived: "Архивирован",
    paused: "На паузе",
  },
  priority: {
    P1: "Высокий",
    P2: "Средний",
    P3: "Низкий",
    P4: "Минимальный",
  },
  projects: {
    title: "Мои проекты",
    create_project: "Создать проект",
    no_projects: "Нет проектов",
    create_first: "Создать первый проект",
    name_placeholder: "Название проекта",
    desc_placeholder: "Описание проекта",
    type_label: "Тип проекта",
    budget_label: "Бюджет",
    dates_label: "Даты",
  },
  tasks: {
    title: "Задачи",
    create_task: "Создать задачу",
    no_tasks: "Нет задач",
    drag_hint: "Перетащите сюда задачи",
    title_placeholder: "Заголовок задачи",
    desc_placeholder: "Описание задачи",
    assignee: "Исполнитель",
  },
  errors: {
    fetch_failed: "Не удалось загрузить данные. Проверьте соединение.",
    create_failed: "Не удалось создать. Попробуйте снова.",
    update_failed: "Не удалось обновить. Попробуйте снова.",
    delete_failed: "Не удалось удалить. Попробуйте снова.",
    validation_required: "Пожалуйста, заполните обязательные поля.",
  }
};

export const getStatusLabel = (status: string) => {
  return DICTIONARY.status[status as keyof typeof DICTIONARY.status] || status;
};

export const getPriorityLabel = (priority: string) => {
  return DICTIONARY.priority[priority as keyof typeof DICTIONARY.priority] || priority;
};
